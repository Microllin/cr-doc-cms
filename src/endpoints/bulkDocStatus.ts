import type { Endpoint, PayloadRequest } from 'payload'

import type { Doc } from '@/payload-types'

type ContentLocale = 'zh' | 'en'
type LocalizedText = Partial<Record<ContentLocale, string | null>>

function hasContent(doc: Doc, locale: ContentLocale): boolean {
  const title = doc.title as unknown as LocalizedText
  const content = doc.content as unknown as LocalizedText
  return Boolean(title?.[locale]?.trim() && content?.[locale]?.trim())
}

/**
 * 批量发布不能直接 PATCH 默认 locale：选中英文文档时，Payload 会按默认中文
 * 校验 required title/content，最终报「标题无效」。这里读取 locale=all，逐篇使用
 * 真实存在标题和正文的语言更新状态，因此中英文文档可混合选择后一次发布。
 */
export const bulkDocStatusEndpoint: Endpoint = {
  path: '/bulk-doc-status',
  method: 'post',
  handler: async (req: PayloadRequest): Promise<Response> => {
    if (!req.user) return Response.json({ error: 'Login required' }, { status: 401 })

    let body: { ids?: unknown; locale?: unknown; status?: unknown }
    try {
      body = (await req.json?.()) as typeof body
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const ids = Array.isArray(body?.ids)
      ? Array.from(new Set(body.ids.filter((id): id is number | string => ['number', 'string'].includes(typeof id))))
      : []
    const status = body?.status === 'published' ? 'published' : body?.status === 'draft' ? 'draft' : null
    const preferred: ContentLocale = body?.locale === 'en' ? 'en' : 'zh'

    if (!ids.length || !status) {
      return Response.json({ error: 'ids and a valid status are required' }, { status: 400 })
    }

    const found = await req.payload.find({
      collection: 'docs',
      where: { id: { in: ids } },
      locale: 'all',
      fallbackLocale: false,
      draft: true,
      depth: 0,
      limit: ids.length,
      pagination: false,
      overrideAccess: false,
      req,
    })

    const docs = found.docs as unknown as Doc[]
    const errors: { id: number | string; message: string }[] = []
    const updated: { id: number | string; locale: ContentLocale }[] = []

    for (const doc of docs) {
      const alternate: ContentLocale = preferred === 'zh' ? 'en' : 'zh'
      const locale = hasContent(doc, preferred)
        ? preferred
        : hasContent(doc, alternate)
          ? alternate
          : null

      if (!locale) {
        errors.push({ id: doc.id, message: `Document ${doc.slug} has no complete title and content` })
        continue
      }

      try {
        await req.payload.update({
          collection: 'docs',
          id: doc.id,
          data: { _status: status },
          locale,
          fallbackLocale: false,
          overrideAccess: false,
          req,
        })
        updated.push({ id: doc.id, locale })
      } catch (error) {
        errors.push({
          id: doc.id,
          message: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const foundIDs = new Set(docs.map((doc) => String(doc.id)))
    for (const id of ids) {
      if (!foundIDs.has(String(id))) errors.push({ id, message: 'Document not found or access denied' })
    }

    return Response.json({ docs: updated, errors }, { status: errors.length ? 207 : 200 })
  },
}
