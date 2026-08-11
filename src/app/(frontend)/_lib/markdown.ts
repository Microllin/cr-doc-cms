import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypePrettyCode from 'rehype-pretty-code'
import rehypeStringify from 'rehype-stringify'
import { visit } from 'unist-util-visit'
import { toString as mdastToString } from 'mdast-util-to-string'
import GithubSlugger from 'github-slugger'
import { deriveSlug } from '@/lib/md-import'
import { docUrl, type Locale } from './locale'

export type TocItem = { id: string; text: string; level: number }

// remark 插件：收集 h2/h3 标题，生成右侧 TOC 数据。
// 用 github-slugger 复刻 rehype-slug 的 id 生成规则，保证锚点一致。
function collectHeadings(acc: TocItem[]) {
  const slugger = new GithubSlugger()
  return () => (tree: unknown) => {
    visit(tree as any, 'heading', (node: any) => {
      const text = mdastToString(node)
      const id = slugger.slug(text)
      if (node.depth === 2 || node.depth === 3) {
        acc.push({ id, text, level: node.depth })
      }
    })
  }
}

/** 把 Markdown 文件间的相对链接转换成文档站路由，避免浏览器跳到不存在的 .md 地址。 */
function rewriteDocLinks(locale: Locale, currentSlug: string) {
  return () => (tree: unknown) => {
    visit(tree as any, 'link', (node: { url?: string }) => {
      const url = node.url || ''
      if (!/\.(?:md|markdown)(?:[?#].*)?$/i.test(url)) return
      if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//') || url.startsWith('/')) return

      const suffixAt = url.search(/[?#]/)
      const rawPath = suffixAt >= 0 ? url.slice(0, suffixAt) : url
      const suffix = suffixAt >= 0 ? url.slice(suffixAt) : ''
      let path = rawPath
      try {
        path = decodeURIComponent(rawPath)
      } catch {
        // 非法百分号转义保持原文，不应让一条链接带崩整篇渲染。
      }
      const base = currentSlug.includes('/') ? currentSlug.slice(0, currentSlug.lastIndexOf('/')) : ''
      const segments: string[] = []
      for (const part of `${base}/${path}`.split('/')) {
        if (!part || part === '.') continue
        if (part === '..') segments.pop()
        else segments.push(part)
      }
      // 必须复用导入器的 slug 规则：Getting Started.md 实际入库为
      // getting-started，若只去扩展名会重写成 Getting%20Started 并跳 404。
      const slug = deriveSlug(segments.join('/'))
      node.url = `${docUrl(locale, slug)}${suffix}`
    })
  }
}

const prettyCodeOptions = {
  theme: { light: 'github-light', dark: 'github-dark' },
  keepBackground: false,
  defaultLang: 'plaintext',
}

// 把 Markdown 源码渲染成 VitePress 风格 HTML，并返回 TOC。
// Shiki 双主题（light/dark），标题自动锚点（wrap 模式，和 VitePress 一致）。
export async function renderMarkdown(
  markdown: string,
  context?: { locale: Locale; slug: string },
): Promise<{ html: string; toc: TocItem[] }> {
  const toc: TocItem[] = []

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(collectHeadings(toc))
    .use(context ? rewriteDocLinks(context.locale, context.slug) : () => undefined)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings as any, {
      behavior: 'wrap',
      properties: { className: ['header-anchor'], ariaHidden: true, tabIndex: -1 },
    })
    .use(rehypePrettyCode as any, prettyCodeOptions)
    .use(rehypeStringify)
    .process(markdown || '')

  return { html: String(file), toc }
}
