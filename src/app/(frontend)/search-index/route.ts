import { NextRequest, NextResponse } from 'next/server'
import { getPayloadClient, docUrl, isLocale, DEFAULT_LOCALE, type Locale } from '../_lib/nav'
import type { Doc } from '@/payload-types'

// 搜索索引接口：返回全部已发布文档的精简数据，前端 minisearch 建索引
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('locale') || DEFAULT_LOCALE
  const locale: Locale = isLocale(q) ? q : DEFAULT_LOCALE

  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'docs',
    // 只索引已发布的：否则草稿内容会通过搜索框泄露出去
    where: { _status: { equals: 'published' } },
    locale,
    fallbackLocale: false,
    limit: 1000,
    depth: 0,
    pagination: false,
  })

  const index = res.docs
    .filter((d) => d.title && d.content)
    .map((d) => {
    const doc = d as Doc
    // 从 Markdown 里抽出标题文本，参与搜索
    const headings = (doc.content || '')
      .split('\n')
      .filter((l) => /^#{1,6}\s/.test(l))
      .map((l) => l.replace(/^#{1,6}\s/, '').trim())
      .join(' ')
    return {
      id: doc.id,
      title: doc.title,
      slug: doc.slug,
      url: docUrl(locale, doc.slug),
      headings,
      excerpt: doc.excerpt || '',
    }
    })

  return NextResponse.json(index)
}
