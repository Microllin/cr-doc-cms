import type { Endpoint, PayloadRequest } from 'payload'
import { createHash } from 'crypto'

import { formatBytes, tAdmin } from '@/lib/admin-i18n'
import {
  deriveSlug,
  deriveTitle,
  extractImageRefs,
  isImageFile,
  isLocalImageRef,
  isMarkdownFile,
  mediaUrlFor,
  parseFrontmatter,
  resolveRefPath,
  rewriteImageRefs,
  stripLeadingH1,
} from '@/lib/md-import'

// POST /api/import-md
//
// 接收「一个或多个 .md + 它们引用的图片」，一次性完成：
//   md 解析 -> 图片按内容去重上传到 media -> 图片引用重写为 media URL -> upsert 文档
//
// 单个上传与批量上传走同一条管线：批量只是文件多几个。
// 前端用 <input multiple webkitdirectory> 选整个文件夹时，浏览器能给出
// webkitRelativePath，我们用它还原目录结构 —— md 里的相对图片路径才解析得准。
//
// 表单字段：
//   files    File[]   —— md 与图片混在一起，顺序不限
//   paths    string[] —— 与 files 一一对应的相对路径（缺省时退化为文件名）
//   locale   'zh'|'en'
//   status   'published'|'draft'
//   onExisting 'update'|'skip'
//   dryRun   '1' 时只预演、不写库

type FileEntry = { path: string; name: string; type: string; buffer: Buffer }

type ImageOutcome = {
  ref: string
  resolvedPath: string
  status: 'created' | 'missing' | 'reused'
  filename?: string
  url?: string
}

type DocOutcome = {
  path: string
  slug: string
  title: string
  action: 'created' | 'failed' | 'skipped' | 'updated'
  docId?: number | string
  error?: string
  images: ImageOutcome[]
}

const IMAGE_MIME: Record<string, string> = {
  apng: 'image/apng',
  avif: 'image/avif',
  bmp: 'image/bmp',
  gif: 'image/gif',
  ico: 'image/x-icon',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  webp: 'image/webp',
}

// 上传体积闸门。
//
// 所有文件都会被读进内存（collected 里全是 Buffer），而 web 容器在
// docker-compose.yml 里被 mem_limit 卡在 512m —— 不设上限的话，选中一个装满
// 高清截图的文件夹就能把容器顶爆重启，正在写的东西一起丢。
// 关键是「先看 File.size，再决定要不要 arrayBuffer()」：等读完再判断就已经晚了。
const MAX_FILE_BYTES = 16 * 1024 * 1024
const MAX_TOTAL_BYTES = 64 * 1024 * 1024

function guessMime(name: string, provided?: string): string {
  if (provided && provided !== 'application/octet-stream') return provided
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : ''
  return IMAGE_MIME[ext] || 'application/octet-stream'
}

/** 取 markdown 里这张图的 alt 文本 —— media.alt 是必填，用它比用文件名更有意义 */
function altForRef(md: string, ref: string): string | undefined {
  const escaped = ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = new RegExp(`!\\[([^\\]]*)\\]\\(\\s*<?${escaped}`).exec(md)
  const alt = m?.[1]?.trim()
  return alt || undefined
}

/**
 * 浏览器选文件夹时，webkitRelativePath 一定带上被选中文件夹自身的名字
 * （选 docs/ 会得到 docs/guide/intro.md）。若不剥掉，slug 会平白多一层 docs/。
 * 规则刻意保守：只在**所有**文件共享同一个首段时才认为它是多出来的根。
 * 调用方显式传 stripPrefix 时以传入值为准（可传空字符串表示不剥）。
 */
function autoCommonRoot(paths: string[]): string {
  if (paths.length === 0) return ''
  const first = paths[0].split('/')
  if (first.length < 2) return ''
  const root = first[0]
  return paths.every((p) => p.startsWith(`${root}/`)) ? root : ''
}


export const importMarkdownEndpoint: Endpoint = {
  path: '/import-md',
  method: 'post',
  handler: async (req: PayloadRequest): Promise<Response> => {
    // 自定义端点默认不做鉴权，必须自己挡住未登录请求
    if (!req.user) {
      return Response.json({ error: tAdmin(req, 'crDocs:errLoginRequired') }, { status: 401 })
    }

    const { payload } = req

    // PayloadRequest 是 Partial<Request>，formData 在类型上可选；运行时是真 Request。
    if (typeof req.formData !== 'function') {
      return Response.json({ error: tAdmin(req, 'crDocs:errNeedMultipart') }, { status: 400 })
    }

    let form: FormData
    try {
      form = await req.formData()
    } catch {
      return Response.json({ error: tAdmin(req, 'crDocs:errFormParse') }, { status: 400 })
    }

    const dryRun = form.get('dryRun') === '1'
    const localeRaw = String(form.get('locale') || 'zh')
    const locale = localeRaw === 'en' ? 'en' : 'zh'
    // 缺省一律草稿：即使绕过后台表单直接调接口，也不能意外把未审核内容上线。
    const status = String(form.get('status') || 'draft') === 'published' ? 'published' : 'draft'
    const onExisting = String(form.get('onExisting') || 'update') === 'skip' ? 'skip' : 'update'

    const rawFiles = form.getAll('files')
    const rawPaths = form.getAll('paths').map((p) => String(p))
    if (!rawFiles.length) {
      return Response.json({ error: tAdmin(req, 'crDocs:errNoFiles') }, { status: 400 })
    }

    // 收文件：路径优先用前端给的相对路径，没有就退化成文件名
    const collected: FileEntry[] = []
    let totalBytes = 0
    for (let i = 0; i < rawFiles.length; i++) {
      const f = rawFiles[i]
      if (!f || typeof f === 'string') continue
      const file = f as unknown as globalThis.File
      const rel = (rawPaths[i] || file.name || '').replace(/^\.?\//, '')
      if (!rel) continue

      // 先按声明体积拦，再读进内存 —— 读完再判断就已经吃过内存了
      if (file.size > MAX_FILE_BYTES) {
        return Response.json(
          {
            error: tAdmin(req, 'crDocs:errFileTooLarge', {
              name: rel,
              size: formatBytes(file.size),
              limit: formatBytes(MAX_FILE_BYTES),
            }),
          },
          { status: 413 },
        )
      }
      totalBytes += file.size
      if (totalBytes > MAX_TOTAL_BYTES) {
        return Response.json(
          {
            error: tAdmin(req, 'crDocs:errTotalTooLarge', {
              size: formatBytes(totalBytes),
              limit: formatBytes(MAX_TOTAL_BYTES),
            }),
          },
          { status: 413 },
        )
      }

      collected.push({
        path: rel,
        name: rel.split('/').pop() || rel,
        type: file.type || '',
        buffer: Buffer.from(await file.arrayBuffer()),
      })
    }

    // 剥掉「选文件夹」多出来的那层根目录（可由前端显式指定或关闭）
    const stripPrefix = (
      form.has('stripPrefix')
        ? String(form.get('stripPrefix') || '')
        : autoCommonRoot(collected.map((e) => e.path))
    )
      .replace(/^\/+|\/+$/g, '')
      .trim()

    const entries: FileEntry[] = stripPrefix
      ? collected.map((e) =>
          e.path === stripPrefix || e.path.startsWith(`${stripPrefix}/`)
            ? { ...e, path: e.path.slice(stripPrefix.length).replace(/^\/+/, '') }
            : e,
        )
      : collected

    const markdowns = entries.filter((e) => isMarkdownFile(e.name))
    const images = entries.filter((e) => !isMarkdownFile(e.name) && isImageFile(e.name))
    const ignored = entries
      .filter((e) => !isMarkdownFile(e.name) && !isImageFile(e.name))
      .map((e) => e.path)

    if (!markdowns.length) {
      return Response.json(
        { error: tAdmin(req, 'crDocs:errNoMarkdown') },
        { status: 400 },
      )
    }

    // 图片按相对路径建索引；同时建「文件名 -> 路径」兜底，
    // 容忍 md 里写了错误的目录层级但文件名对得上的情况。
    const byPath = new Map<string, FileEntry>()
    const byName = new Map<string, FileEntry[]>()
    for (const img of images) {
      byPath.set(img.path, img)
      const list = byName.get(img.name) || []
      list.push(img)
      byName.set(img.name, list)
    }

    // 本次运行内的 sha256 -> 已入库文件名，避免同一张图重复上传
    const uploadedBySha = new Map<string, string>()

    /** 确保图片已入 media（去重：先查本次运行缓存，再查库），返回真实文件名 */
    async function ensureMedia(
      img: FileEntry,
      alt: string,
      createdForDoc: { id: number | string; sha: string }[],
    ): Promise<{ filename: string; reused: boolean }> {
      const sha = createHash('sha256').update(img.buffer).digest('hex')

      const cached = uploadedBySha.get(sha)
      if (cached) return { filename: cached, reused: true }

      const existing = await payload.find({
        collection: 'media',
        where: { sha256: { equals: sha } },
        limit: 1,
        depth: 0,
      })
      const hit = existing.docs[0] as { filename?: string } | undefined
      if (hit?.filename) {
        uploadedBySha.set(sha, hit.filename)
        return { filename: hit.filename, reused: true }
      }

      if (dryRun) {
        uploadedBySha.set(sha, img.name)
        return { filename: img.name, reused: false }
      }

      const created = (await payload.create({
        collection: 'media',
        data: { alt, sha256: sha },
        file: {
          data: img.buffer,
          mimetype: guessMime(img.name, img.type),
          name: img.name,
          size: img.buffer.byteLength,
        },
      })) as { id: number | string; filename?: string }

      // 必须用入库后的 filename：media.filename 有唯一索引，
      // 同名不同内容会被 Payload 自动改名成 xxx-1.png
      const filename = created.filename || img.name
      uploadedBySha.set(sha, filename)
      createdForDoc.push({ id: created.id, sha })
      return { filename, reused: false }
    }

    // 同批文件可能推导出相同 slug（如 guide.md 与 guide/index.md）。
    // 若边处理边 upsert，后一篇会静默覆盖前一篇，报告却看似成功。
    // 在任何媒体/文档写入前先找出冲突，冲突项全部明确失败。
    const slugCounts = new Map<string, number>()
    for (const md of markdowns) {
      const source = md.buffer.toString('utf8')
      const { data: fm } = parseFrontmatter(source)
      const slug = (fm.slug || deriveSlug(md.path)).replace(/^\/+|\/+$/g, '')
      if (slug) slugCounts.set(slug, (slugCounts.get(slug) || 0) + 1)
    }

    const results: DocOutcome[] = []

    for (const md of markdowns) {
      const source = md.buffer.toString('utf8')
      const { data: fm, body } = parseFrontmatter(source)
      const title = deriveTitle(fm, body, md.path)
      const slug = (fm.slug || deriveSlug(md.path)).replace(/^\/+|\/+$/g, '')
      const outcome: DocOutcome = { path: md.path, slug, title, action: 'failed', images: [] }

      if (!slug) {
        outcome.error = tAdmin(req, 'crDocs:errNoSlug')
        results.push(outcome)
        continue
      }
      if ((slugCounts.get(slug) || 0) > 1) {
        outcome.error = tAdmin(req, 'crDocs:errDuplicateSlug', { slug })
        results.push(outcome)
        continue
      }

      const createdForDoc: { id: number | string; sha: string }[] = []

      try {
        // 先判断是否跳过，再处理图片。否则「跳过已有文档」仍会写入一批无人引用的媒体。
        const found = await payload.find({
          collection: 'docs',
          where: { slug: { equals: slug } },
          limit: 1,
          depth: 0,
          draft: true,
          locale,
        })
        const existing = found.docs[0] as { id: number | string } | undefined

        if (existing && onExisting === 'skip') {
          outcome.action = 'skipped'
          outcome.docId = existing.id
          results.push(outcome)
          continue
        }

        let content = stripLeadingH1(body, title)

        // 图片引用：先异步把图片都入库拿到最终 URL，再同步重写正文
        // （rewriteImageRefs 是同步的，不能在它内部 await 上传）
        const urlByRef = new Map<string, string>()
        const localRefs = Array.from(
          new Set(
            extractImageRefs(content)
              .map((r) => r.raw)
              .filter(isLocalImageRef),
          ),
        )

        for (const ref of localRefs) {
          const resolvedPath = resolveRefPath(md.path, ref)
          let img = byPath.get(resolvedPath)
          if (!img) {
            // 兜底：按文件名唯一匹配
            const base = resolvedPath.split('/').pop() || resolvedPath
            const candidates = byName.get(base)
            if (candidates?.length === 1) img = candidates[0]
          }
          if (!img) {
            outcome.images.push({ ref, resolvedPath, status: 'missing' })
            continue
          }
          const alt = altForRef(content, ref) || img.name.replace(/\.[^.]+$/, '')
          const { filename, reused } = await ensureMedia(img, alt, createdForDoc)
          const url = mediaUrlFor(filename)
          urlByRef.set(ref, url)
          outcome.images.push({
            ref,
            resolvedPath,
            status: reused ? 'reused' : 'created',
            filename,
            url,
          })
        }

        content = rewriteImageRefs(content, (raw) => urlByRef.get(raw) ?? null)

        const data: Record<string, unknown> = {
          title,
          slug,
          content,
          _status: status,
        }
        if (fm.excerpt) data.excerpt = fm.excerpt

        if (dryRun) {
          outcome.action = existing ? 'updated' : 'created'
          outcome.docId = existing?.id
          results.push(outcome)
          continue
        }

        if (existing) {
          const updated = await payload.update({
            collection: 'docs',
            id: existing.id,
            data,
            locale,
          })
          outcome.action = 'updated'
          outcome.docId = (updated as { id: number | string }).id
        } else {
          const created = await payload.create({
            collection: 'docs',
            data: data as never,
            locale,
          })
          outcome.action = 'created'
          outcome.docId = (created as { id: number | string }).id
        }
      } catch (err) {
        // 单篇失败不拖垮整批，但要撤销本篇刚创建的图片，避免文档没写成、媒体却越积越多。
        const cleanupErrors: string[] = []
        for (const media of createdForDoc.reverse()) {
          try {
            await payload.delete({ collection: 'media', id: media.id })
            uploadedBySha.delete(media.sha)
          } catch (cleanupError) {
            cleanupErrors.push(
              cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
            )
          }
        }

        outcome.action = 'failed'
        const reason = err instanceof Error ? err.message : String(err)
        outcome.error = cleanupErrors.length
          ? `${reason}; media cleanup failed: ${cleanupErrors.join('; ')}`
          : reason
      }

      results.push(outcome)
    }

    const summary = {
      dryRun,
      locale,
      status,
      onExisting,
      stripPrefix,
      docs: {
        total: results.length,
        created: results.filter((r) => r.action === 'created').length,
        updated: results.filter((r) => r.action === 'updated').length,
        skipped: results.filter((r) => r.action === 'skipped').length,
        failed: results.filter((r) => r.action === 'failed').length,
      },
      images: {
        uploaded: new Set(
          results.flatMap((r) =>
            r.images.filter((i) => i.status === 'created').map((i) => i.filename),
          ),
        ).size,
        reused: results.flatMap((r) => r.images.filter((i) => i.status === 'reused')).length,
        missing: results.flatMap((r) => r.images.filter((i) => i.status === 'missing')).length,
      },
      ignoredFiles: ignored,
    }

    return Response.json({ summary, results })
  },
}
