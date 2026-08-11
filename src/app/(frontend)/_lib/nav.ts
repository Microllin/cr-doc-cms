import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Doc } from '@/payload-types'
import { DEFAULT_LOCALE, docUrl, type Locale } from './locale'

// 从 locale.ts 再导出，方便服务端代码统一从 nav 引入
export { LOCALES, DEFAULT_LOCALE, isLocale, parsePath, docUrl } from './locale'
export type { Locale } from './locale'

let _payload: Awaited<ReturnType<typeof getPayload>> | null = null
export async function getPayloadClient() {
  if (_payload) return _payload
  _payload = await getPayload({ config: await config })
  return _payload
}

export type NavLink = { title: string; slug: string; url: string }

function hasLocalizedContent(doc: Doc): boolean {
  // fallbackLocale:false 时，Payload 会把当前语言的值直接放在 title/content 上。
  return Boolean(doc.title && doc.content)
}

export type NavGroup = {
  label: string
  collapsed: boolean
  items: NavLink[]
  /** 子分组：目录再往下一层。手工编排的分组不产生子级，只有自动归组会。 */
  children?: NavGroup[]
}

/**
 * 前台一律只认已发布的文档。
 *
 * 注意这个 where 不能省：前台走的是 Local API，而 Local API 默认
 * overrideAccess: true —— 集合上那条「未登录只看已发布」的 access 规则
 * 对它不生效。少了这层过滤，后台「取消发布」在前台就毫无反应，
 * 未定稿的内容照旧对外可见。
 */
const PUBLISHED = { _status: { equals: 'published' } } as const

/**
 * 把 slug 的首段变成人看的分组名：01-入门与概览 -> 入门与概览。
 * 数字前缀只是用来排序的，不该出现在界面上。
 */
function prettifyGroup(seg: string): string {
  return seg.replace(/^\d+[-_.\s]*/, '').trim() || seg
}

/**
 * 读取侧边栏。
 *
 * 结构 = 后台手工编排的「侧边栏导航」 + 自动补上所有没被它收录的已发布文档。
 *
 * 为什么要自动补：侧边栏本来是一份纯手工清单，而 Markdown 导入器不会往里写。
 * 于是导入 60 篇新文档后，库里有 99 篇、前台却只显示手工清单里的那 36 篇 ——
 * 看起来就像「后台改了前台没反应」。这不是缓存问题，是清单从来没人更新。
 * 只要还依赖人去同步这份清单，这个漂移就会反复发生，所以这里改成兜底自动收录：
 * 任何已发布但没进导航的文档，都按 slug 首段自动归组挂出来。
 *
 * 手工编排的部分仍然优先且保持原有顺序，自动补的排在其后。
 */
export async function getSidebar(locale: Locale): Promise<NavGroup[]> {
  try {
    const payload = await getPayloadClient()
    const [nav, all] = await Promise.all([
    payload.findGlobal({
      slug: 'navigation',
      locale,
      fallbackLocale: false,
      depth: 1,
    }),
    payload.find({
      collection: 'docs',
      where: PUBLISHED,
      locale,
      fallbackLocale: false,
      limit: 2000,
      depth: 0,
      pagination: false,
      sort: 'slug',
    }),
  ])

  const groups: NavGroup[] = []
  const curated = new Set<string>()

  for (const g of nav?.groups ?? []) {
    const items: NavLink[] = []
    for (const it of g.items ?? []) {
      const doc = it.doc
      // depth:1 已经把关联文档填成对象，顺手挡掉未发布的：
      // 否则侧边栏会挂出一条点进去 404 的死链
      if (
        doc &&
        typeof doc === 'object' &&
        doc._status === 'published' &&
        hasLocalizedContent(doc as Doc)
      ) {
        curated.add(doc.slug)
        items.push({ title: doc.title, slug: doc.slug, url: docUrl(locale, doc.slug) })
      }
    }
    // 一条文档都挂不出来的分组直接不要 —— 否则侧边栏会多出一个点开是空的标题。
    //
    // 这不是假想情况：删文档时 Docs 的 afterOperation 钩子只摘掉指向它的 items，
    // 分组本身留在原地。旧的 39 篇被清掉后，库里就剩下 5 个空壳分组（入门 /
    // 开发者指南 / 管理员手册 / 子用户手册 / 工具接入），排在自动归组前面，
    // 名字又和自动归组高度重合 —— 前台看起来就像「同一批文档出现了两套侧边栏」。
    // 空分组既然没有任何可点的东西，就没有渲染的理由，在这里兜掉最省事，
    // 也免得以后每次删文档都要有人记得回后台手工清理。
    if (items.length > 0) {
      groups.push({ label: g.label ?? '', collapsed: !!g.collapsed, items })
    }
  }

  // 兜底：已发布却没被手工清单收录的文档，按 slug 的目录层级自动建树。
  //
  // 导入整个文件夹时 slug 会原样保留目录结构（01-入门与概览/02-进阶/03-xxx），
  // 所以这里不是只看首段拍平成一层，而是有几层就分几级 —— 上传时的目录结构
  // 就是读者看到的导航结构，不需要再手工编排一遍。
  const root: AutoNode = { items: [], children: new Map() }
  for (const d of all.docs as Doc[]) {
    if (!d.slug || curated.has(d.slug) || !hasLocalizedContent(d)) continue
    const link = { title: d.title, slug: d.slug, url: docUrl(locale, d.slug) }
    const segs = d.slug.split('/').filter(Boolean)
    // 最后一段是文档自身，前面的才是目录
    let node = root
    for (let i = 0; i < segs.length - 1; i++) {
      const key = segs[i]
      let child = node.children.get(key)
      if (!child) {
        child = { items: [], children: new Map() }
        node.children.set(key, child)
      }
      node = child
    }
    node.items.push(link)
  }

  const ungrouped = locale === 'en' ? 'Other' : '未归类'
  groups.push(...autoToGroups(root.children, ungrouped))
  // 不在任何目录下的散篇（slug 里没有 /）单独兜一组
  if (root.items.length > 0) {
    groups.push({ label: ungrouped, collapsed: true, items: root.items })
  }

    return groups
  } catch (error) {
    // 文档为空或数据库暂时不可用时，前台仍应渲染空状态，而不是整个文档入口 404/500。
    console.error('[docs] failed to load sidebar:', error)
    return []
  }
}

/** 自动归组时用的中间树：children 是子目录，items 是直接挂在本层的文档 */
type AutoNode = { items: NavLink[]; children: Map<string, AutoNode> }

/** 目录树 -> 侧边栏分组，按目录名排序（数字前缀天然给出正确顺序） */
function autoToGroups(children: Map<string, AutoNode>, ungrouped: string): NavGroup[] {
  return Array.from(children.keys())
    .sort()
    .map((key) => {
      const node = children.get(key)!
      const sub = autoToGroups(node.children, ungrouped)
      return {
        label: prettifyGroup(key),
        // 自动归组默认收起。全站 60 篇文档若一次全摊开，侧边栏长到要滚好几屏，
        // 想找隔壁分组得先划过当前分组的二十几条 —— 这正是「侧边栏很难用」的由来。
        // Sidebar 会把「含当前页」的那一支强制展开（见 containsPath），
        // 所以收起来不影响定位当前位置，只是不再把无关分组一起摊在脸上。
        // 手工编排的分组不受影响，仍然听后台那个「默认折叠」勾选。
        collapsed: true,
        items: node.items,
        ...(sub.length > 0 ? { children: sub } : {}),
      }
    })
}

// 侧边栏扁平顺序 -> 用于计算上一页/下一页
export function flattenSidebar(groups: NavGroup[]): NavLink[] {
  // 必须递归：自动归组会产生子分组，只取 g.items 会漏掉嵌套层里的文档，
  // 上一页/下一页就会莫名其妙跳过一整个子目录
  return groups.flatMap((g) => [...g.items, ...flattenSidebar(g.children ?? [])])
}

export type PagerLink = { title: string; url: string } | null
export function getPager(
  groups: NavGroup[],
  currentSlug: string,
): { prev: PagerLink; next: PagerLink } {
  const flat = flattenSidebar(groups)
  const idx = flat.findIndex((l) => l.slug === currentSlug)
  if (idx === -1) return { prev: null, next: null }
  const prev = idx > 0 ? flat[idx - 1] : null
  const next = idx < flat.length - 1 ? flat[idx + 1] : null
  return {
    prev: prev ? { title: prev.title, url: prev.url } : null,
    next: next ? { title: next.title, url: next.url } : null,
  }
}

// 按 slug + locale 取单篇文档（仅已发布）
export async function getAvailableLocales(slug: string): Promise<Locale[]> {
  const available = await Promise.all(
    (['zh', 'en'] as Locale[]).map(async (locale) => {
      const doc = await getDocBySlug(slug, locale)
      return doc ? locale : null
    }),
  )
  return available.filter((locale): locale is Locale => locale !== null)
}

export async function getDocBySlug(slug: string, locale: Locale): Promise<Doc | null> {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'docs',
    where: { and: [{ slug: { equals: slug } }, PUBLISHED] },
    locale,
    fallbackLocale: false,
    limit: 1,
    depth: 0,
  })
  const doc = (res.docs[0] as Doc) ?? null
  return doc && doc.title && doc.content ? doc : null
}

// 所有文档 slug（用于 generateStaticParams / 兜底导航）
export async function getAllDocSlugs(): Promise<string[]> {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'docs',
    where: PUBLISHED,
    fallbackLocale: false,
    locale: DEFAULT_LOCALE,
    limit: 1000,
    depth: 0,
    pagination: false,
  })
  return res.docs.map((d) => (d as Doc).slug).filter(Boolean)
}

export type SiteSettings = {
  siteName: string
  logoMark: string
  description: string
  logoUrl: string | null
  faviconUrl: string | null
}

// 从 upload 字段里取媒体 URL（depth>=1 时 payload 会填充关联对象）
function mediaUrl(v: unknown): string | null {
  if (v && typeof v === 'object' && 'url' in v) {
    const u = (v as { url?: string }).url
    return u || null
  }
  return null
}

// 读取站点设置（后台可改），带兜底默认值
// 构建期预渲染 / 或数据库暂不可用时不抛错，返回默认值
export async function getSettings(locale: Locale): Promise<SiteSettings> {
  try {
    const payload = await getPayloadClient()
    const s = await payload.findGlobal({ slug: 'settings', locale, depth: 1 })
    const siteName = s?.siteName || 'Docs'
    return {
      siteName,
      logoMark: s?.logoMark || siteName.charAt(0).toUpperCase(),
      description: s?.description || '',
      logoUrl: mediaUrl(s?.logo),
      faviconUrl: mediaUrl(s?.favicon),
    }
  } catch {
    return { siteName: 'Docs', logoMark: 'D', description: '', logoUrl: null, faviconUrl: null }
  }
}
