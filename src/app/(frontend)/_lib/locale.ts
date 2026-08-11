// 纯常量与工具（无 Payload 依赖）——可安全被客户端组件引用
export const LOCALES = ['zh', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'zh'

export function isLocale(v: string | undefined): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v)
}

/**
 * 安全地还原一个路径段。
 *
 * Next.js 的 catch-all 参数在不同场景下可能是「已解码」或「仍带百分号编码」的，
 * 而 Markdown 导入器会按目录名生成 slug —— 目录名一旦是中文
 * （例如 01-入门与概览/00-入门总览），slug 里就带中文，URL 上是一长串 %E5%85%A5…。
 * 若不还原，拿去和库里的中文 slug 比对必然对不上，结果就是文档明明发布了、
 * 前台却一律 404。
 *
 * 解不开就原样返回：slug 里本来就允许出现 %，硬解会抛 URIError 把整页带崩。
 */
function decodeSegment(seg: string): string {
  if (!seg.includes('%')) return seg
  try {
    return decodeURIComponent(seg)
  } catch {
    return seg
  }
}

// 从 /docs/[[...slug]] 的路径段拆出 locale 与文档 slug
// /docs/zh/about/intro -> { locale: 'zh', slug: 'about/intro' }
// /docs/about/intro    -> { locale: 'zh'(默认), slug: 'about/intro' }
export function parsePath(segments: string[] = []): { locale: Locale; slug: string } {
  const decoded = segments.map(decodeSegment)
  if (decoded.length && isLocale(decoded[0])) {
    return { locale: decoded[0] as Locale, slug: decoded.slice(1).join('/') }
  }
  return { locale: DEFAULT_LOCALE, slug: decoded.join('/') }
}

/**
 * 由 slug 拼出文档地址。
 *
 * 每一段都必须 encodeURIComponent —— slug 可能是中文（导入器按目录名生成，
 * 例如 01-入门与概览/00-入门总览）。不编码的话：
 *   1. 服务端 redirect() 会把原始 UTF-8 塞进 Location 响应头，
 *      而 HTTP 头只允许 ASCII，Node 直接抛 “Invalid character in header content”，
 *      整个 /docs/zh 变成 500；
 *   2. href 里的裸中文在部分场景下也会被重复编码。
 * 按 '/' 分段编码，保留路径分隔符本身；parsePath 那边会逐段还原。
 */
export function docUrl(locale: Locale, slug: string): string {
  const path = slug.split('/').filter(Boolean).map(encodeURIComponent).join('/')
  return `/docs/${locale}/${path}`.replace(/\/+$/, '')
}
