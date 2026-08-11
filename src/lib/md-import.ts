// Markdown 导入的纯逻辑层：不依赖 payload / node fs，便于单独测试与推理。
//
// 职责：
//  1. 解析 frontmatter（极简 YAML 子集：仅顶层 `key: value`）
//  2. 找出正文里的**本地**图片引用（markdown 与 <img>，跳过外链与已映射的 URL）
//  3. 把本地引用重写为 media URL
//  4. 从文件相对路径推导 slug / 标题
//
// 设计前提：图片按「相对 md 文件的路径」引用，这与本地写作、VS Code 预览、
// GitHub 渲染的行为一致，也是从别处导出的 md 最常见的形态。

export type Frontmatter = Record<string, string>

/** 已经是站内 media 地址的前缀 —— 二次导入时不应再被当作本地图片处理 */
const MEDIA_URL_PREFIX = '/api/media/file/'

/**
 * 解析 frontmatter。只认文件最开头的 `---` 块，只解析顶层 `key: value`。
 * 刻意不支持嵌套 / 数组：导入只需要 title、slug、excerpt、order 这类标量。
 * 解析不出来时一律当作没有 frontmatter，正文原样返回（宁可少认，不可吃掉正文）。
 */
export function parseFrontmatter(src: string): { data: Frontmatter; body: string } {
  const normalized = src.replace(/^﻿/, '') // 去掉 BOM，否则 --- 匹配不上
  const match = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(normalized)
  if (!match) return { data: {}, body: normalized }

  const data: Frontmatter = {}
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const sep = trimmed.indexOf(':')
    if (sep <= 0) continue
    const key = trimmed.slice(0, sep).trim()
    let value = trimmed.slice(sep + 1).trim()
    // 去掉成对引号
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1)
    }
    if (key) data[key] = value
  }
  return { data, body: normalized.slice(match[0].length) }
}

/**
 * 图片引用的匹配位置。raw 是「括号里那段原文」，用于精确替换，
 * 避免把 alt 文本或周边内容一起改掉。
 */
export type ImageRef = { raw: string; start: number; end: number }

// markdown: ![alt](path "title")，path 允许被 <> 包裹
const MD_IMAGE = /!\[[^\]]*\]\(\s*(<[^>]*>|[^)\s]+)(\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g
// html: <img ... src="path" ...>
const HTML_IMAGE = /<img\b[^>]*?\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi

/** 找出正文里所有图片引用（含外链，是否处理由调用方用 isLocalImageRef 决定） */
export function extractImageRefs(md: string): ImageRef[] {
  const refs: ImageRef[] = []

  MD_IMAGE.lastIndex = 0
  for (let m = MD_IMAGE.exec(md); m; m = MD_IMAGE.exec(md)) {
    const rawGroup = m[1]
    const stripped = rawGroup.startsWith('<') && rawGroup.endsWith('>')
    const raw = stripped ? rawGroup.slice(1, -1) : rawGroup
    // 定位到 path 本身在原文中的下标（跳过 <>）
    const groupStart = m.index + m[0].indexOf(rawGroup) + (stripped ? 1 : 0)
    refs.push({ raw, start: groupStart, end: groupStart + raw.length })
  }

  HTML_IMAGE.lastIndex = 0
  for (let m = HTML_IMAGE.exec(md); m; m = HTML_IMAGE.exec(md)) {
    const quoted = m[2] ?? m[3]
    const raw = quoted ?? m[4] ?? ''
    if (!raw) continue
    const groupStart = m.index + m[0].lastIndexOf(raw)
    refs.push({ raw, start: groupStart, end: groupStart + raw.length })
  }

  return refs.sort((a, b) => a.start - b.start)
}

/**
 * 是否是「需要我们接管的本地图片」。
 * 排除：带协议的外链 / data: / 协议相对 // / 页内锚点 / 已经是 media 地址的。
 */
export function isLocalImageRef(ref: string): boolean {
  const r = ref.trim()
  if (!r) return false
  if (r.startsWith('//')) return false
  if (r.startsWith('#')) return false
  if (/^[a-z][a-z0-9+.-]*:/i.test(r)) return false // http: https: data: file: …
  if (r.startsWith(MEDIA_URL_PREFIX)) return false // 已映射，幂等
  return true
}

/** posix 风格路径归一：处理 . 与 ..，不依赖 node:path（此文件要能在任意环境跑） */
function normalizePosix(p: string): string {
  const isAbs = p.startsWith('/')
  const out: string[] = []
  for (const seg of p.split('/')) {
    if (!seg || seg === '.') continue
    if (seg === '..') {
      if (out.length && out[out.length - 1] !== '..') out.pop()
      else if (!isAbs) out.push('..')
      continue
    }
    out.push(seg)
  }
  return out.join('/')
}

/**
 * 把图片引用解析成「相对上传根目录的路径」，用于和上传的文件集合对表。
 * mdRelPath 是 md 文件相对上传根的路径，如 guide/admin/api-keys.md。
 * 会剥掉 ?query 与 #hash 并做 URL 解码（md 里常见 %20）。
 */
export function resolveRefPath(mdRelPath: string, ref: string): string {
  let r = ref.trim().split('#')[0].split('?')[0]
  try {
    r = decodeURIComponent(r)
  } catch {
    // 引用里有非法转义就按原文处理，不要因为一张图崩掉整篇导入
  }
  if (r.startsWith('/')) return normalizePosix(r) // 站内绝对路径：相对上传根解释
  const dir = mdRelPath.includes('/') ? mdRelPath.slice(0, mdRelPath.lastIndexOf('/')) : ''
  return normalizePosix(dir ? `${dir}/${r}` : r)
}

/**
 * 重写图片引用。resolve 返回新 URL 则替换，返回 null 则保持原样（外链、找不到的图）。
 * 从后往前替换，避免下标位移。
 */
export function rewriteImageRefs(md: string, resolve: (raw: string) => null | string): string {
  const refs = extractImageRefs(md)
  let out = md
  for (let i = refs.length - 1; i >= 0; i--) {
    const ref = refs[i]
    const next = resolve(ref.raw)
    if (next === null) continue
    out = out.slice(0, ref.start) + next + out.slice(ref.end)
  }
  return out
}

/** media 文件名 -> 站内可访问 URL */
export function mediaUrlFor(filename: string): string {
  return `${MEDIA_URL_PREFIX}${filename}`
}

/**
 * 从 md 文件的相对路径推导 slug：
 *   guide/admin/api-keys.md   -> guide/admin/api-keys
 *   guide/admin/index.md      -> guide/admin      （index/README 归到所在目录）
 *   Getting Started.md        -> getting-started
 * 保留目录层级，这样导入一个文件夹就自然复刻出层级化的 slug。
 */
export function deriveSlug(mdRelPath: string): string {
  const withoutExt = mdRelPath.replace(/\.(md|markdown)$/i, '')
  const segments = normalizePosix(withoutExt).split('/').filter(Boolean)
  if (segments.length && /^(index|readme)$/i.test(segments[segments.length - 1])) {
    segments.pop()
  }
  // 选择整个文档目录时，根 README/index 在剥掉目录名后只剩 README.md。
  // 若直接 pop 会得到空 slug 并导入失败；根入口统一落到可访问的 /index。
  if (segments.length === 0) segments.push('index')
  const slugged = segments.map((s) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
      // 保留所有 Unicode 字母和数字，避免日文、韩文、重音字符等被清成空 slug。
      .replace(/[^\p{L}\p{N}.-]/gu, '')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, ''),
  )
  return slugged.filter(Boolean).join('/')
}

/** 标题优先级：frontmatter.title > 正文第一个 # 一级标题 > 文件名 */
export function deriveTitle(fm: Frontmatter, body: string, mdRelPath: string): string {
  if (fm.title) return fm.title
  const h1 = /^[ \t]*#[ \t]+(.+?)[ \t]*$/m.exec(body)
  if (h1) return h1[1].replace(/\s*#+\s*$/, '').trim()
  const base = mdRelPath.split('/').pop() || mdRelPath
  return base.replace(/\.(md|markdown)$/i, '')
}

/**
 * 正文里若第一行就是 H1 且与标题重复，去掉它 —— 前台 page.tsx 已经单独渲染
 * <h1>{doc.title}</h1>，留着会出现两个大标题。
 */
export function stripLeadingH1(body: string, title: string): string {
  const m = /^\s*#[ \t]+(.+?)[ \t]*(?:\r?\n|$)/.exec(body)
  if (!m) return body
  if (m[1].trim() !== title.trim()) return body
  return body.slice(m[0].length).replace(/^\s*\r?\n/, '')
}

export const IMAGE_EXTENSIONS = new Set([
  'apng',
  'avif',
  'bmp',
  'gif',
  'ico',
  'jpeg',
  'jpg',
  'png',
  'svg',
  'webp',
])

export function isMarkdownFile(name: string): boolean {
  return /\.(md|markdown)$/i.test(name)
}

export function isImageFile(name: string): boolean {
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : ''
  return IMAGE_EXTENSIONS.has(ext)
}
