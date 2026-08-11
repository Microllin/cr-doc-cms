import { describe, expect, it } from 'vitest'

import { renderMarkdown } from '@/app/(frontend)/_lib/markdown'
import {
  deriveSlug,
  deriveTitle,
  parseFrontmatter,
  resolveRefPath,
  rewriteImageRefs,
} from '@/lib/md-import'

describe('Markdown 渲染', () => {
  it('重复标题的 TOC id 与实际 HTML id 保持一致', async () => {
    const { html, toc } = await renderMarkdown('# Same\n\n## Same\n\n### Same')

    expect(toc).toEqual([
      { id: 'same-1', text: 'Same', level: 2 },
      { id: 'same-2', text: 'Same', level: 3 },
    ])
    expect(html).toContain('<h2 id="same-1">')
    expect(html).toContain('<h3 id="same-2">')
  })

  it('把相对 .md 链接改写成当前语言的文档路由', async () => {
    const { html } = await renderMarkdown(
      '[同级](./next.md#part) [上级](../intro/index.md) [外链](https://example.com/a.md)',
      { locale: 'zh', slug: 'guide/setup/current' },
    )

    expect(html).toContain('href="/docs/zh/guide/setup/next#part"')
    expect(html).toContain('href="/docs/zh/guide/intro"')
    expect(html).toContain('href="https://example.com/a.md"')
  })

  it('相对文档链接与导入 slug 使用同一套文件名规范化规则', async () => {
    const { html } = await renderMarkdown(
      '[空格大写](<./Getting Started.md>) [编码空格](./More%20Help.md) [下划线](./API_Keys.md) [目录首页](../intro/README.md)',
      { locale: 'en', slug: 'guide/setup/current' },
    )

    expect(html).toContain('href="/docs/en/guide/setup/getting-started"')
    expect(html).toContain('href="/docs/en/guide/setup/more-help"')
    expect(html).toContain('href="/docs/en/guide/setup/api-keys"')
    expect(html).toContain('href="/docs/en/guide/intro"')
  })
})

describe('Markdown 导入纯逻辑', () => {
  it('从 frontmatter、正文和路径派生字段', () => {
    const source = '---\ntitle: "安装指南"\nexcerpt: 快速安装\n---\n# 安装指南\n\n正文'
    const parsed = parseFrontmatter(source)

    expect(parsed.data).toEqual({ title: '安装指南', excerpt: '快速安装' })
    expect(deriveTitle(parsed.data, parsed.body, 'guide/install.md')).toBe('安装指南')
    expect(deriveSlug('guide/Getting Started.md')).toBe('guide/getting-started')
    expect(deriveSlug('guide/index.md')).toBe('guide')
  })

  it('slug 保留中文以外的 Unicode 字母与数字', () => {
    expect(deriveSlug('ガイド/설치 안내.md')).toBe('ガイド/설치-안내')
    expect(deriveSlug('café/Überblick.md')).toBe('café/überblick')
  })

  it('解析并重写相对图片路径', () => {
    expect(resolveRefPath('guide/setup/index.md', '../images/a b.png')).toBe(
      'guide/images/a b.png',
    )
    expect(
      rewriteImageRefs('![图](../images/a.png)', (raw) =>
        raw === '../images/a.png' ? '/api/media/file/a.png' : null,
      ),
    ).toBe('![图](/api/media/file/a.png)')
  })
})
