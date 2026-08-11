import { describe, expect, it } from 'vitest'

import {
  deriveSlug,
  deriveTitle,
  extractImageRefs,
  isImageFile,
  isLocalImageRef,
  isMarkdownFile,
  parseFrontmatter,
  resolveRefPath,
  rewriteImageRefs,
  stripLeadingH1,
} from '@/lib/md-import'

import { docUrl, parsePath } from '@/app/(frontend)/_lib/locale'

describe('Markdown 边界输入', () => {
  it('空文件、BOM、CRLF 和未闭合 frontmatter 不应抛异常', () => {
    expect(parseFrontmatter('')).toEqual({ data: {}, body: '' })
    expect(parseFrontmatter('\ufeff---\r\ntitle: Test\r\n---\r\nBody')).toEqual({
      data: { title: 'Test' },
      body: 'Body',
    })
    const broken = parseFrontmatter('---\ntitle: Test\nBody')
    expect(broken.data).toEqual({})
    expect(broken.body).toContain('---')
  })

  it('frontmatter 值包含冒号、引号和注释时保持合理解析', () => {
    const result = parseFrontmatter(
      '---\ntitle: "API: Quick Start"\nurl: https://example.com/a:b\n# comment\n---\nBody',
    )
    expect(result.data).toEqual({
      title: 'API: Quick Start',
      url: 'https://example.com/a:b',
    })
  })

  it('各种图片引用只处理本地图片', () => {
    const md = [
      '![a](a.png "title")',
      '![b](<space image.png>)',
      '<img src="html.png" alt="html">',
      '![remote](https://example.com/a.png)',
      '![data](data:image/png;base64,abc)',
      '![media](/api/media/file/existing.png)',
    ].join('\n')
    const refs = extractImageRefs(md).map((r) => r.raw)
    expect(refs).toEqual([
      'a.png',
      'space image.png',
      'html.png',
      'https://example.com/a.png',
      'data:image/png;base64,abc',
      '/api/media/file/existing.png',
    ])
    expect(refs.filter(isLocalImageRef)).toEqual(['a.png', 'space image.png', 'html.png'])
  })

  it('图片路径支持 query/hash、编码空格和多层 ..', () => {
    expect(resolveRefPath('a/b/page.md', '../img/a%20b.png?x=1#top')).toBe('a/img/a b.png')
    expect(resolveRefPath('page.md', '../../outside.png')).toBe('../../outside.png')
  })

  it('重复引用全部重写，外链和缺失映射保持不变', () => {
    const source = '![a](a.png) ![a](a.png) ![x](missing.png)'
    expect(rewriteImageRefs(source, (ref) => (ref === 'a.png' ? '/media/a.png' : null))).toBe(
      '![a](/media/a.png) ![a](/media/a.png) ![x](missing.png)',
    )
  })

  it('文件类型判断大小写不敏感，未知扩展名不误判', () => {
    expect(isMarkdownFile('README.MD')).toBe(true)
    expect(isMarkdownFile('note.markdown')).toBe(true)
    expect(isMarkdownFile('README.md.bak')).toBe(false)
    expect(isImageFile('A.PNG')).toBe(true)
    expect(isImageFile('image')).toBe(false)
    expect(isImageFile('image.exe')).toBe(false)
  })

  it('slug、标题和重复 H1 的边界行为稳定', () => {
    expect(deriveSlug('中文目录/README.md')).toBe('中文目录')
    expect(deriveSlug('README.md')).toBe('index')
    expect(deriveSlug('index.markdown')).toBe('index')
    expect(deriveSlug('---///')).toBe('')
    expect(deriveTitle({}, '# Title ###\n\nBody', 'fallback.md')).toBe('Title')
    expect(stripLeadingH1('# Other\n\nBody', 'Title')).toBe('# Other\n\nBody')
    expect(stripLeadingH1('# Title\n\nBody', 'Title')).toBe('Body')
  })
})

describe('文档 URL 和路径边界', () => {
  it('locale 缺失、未知 locale、编码路径都能稳定处理', () => {
    expect(parsePath()).toEqual({ locale: 'zh', slug: '' })
    expect(parsePath(['unknown', 'page'])).toEqual({ locale: 'zh', slug: 'unknown/page' })
    expect(parsePath(['en', '中文页'])).toEqual({ locale: 'en', slug: '中文页' })
    expect(docUrl('zh', '')).toBe('/docs/zh')
    expect(docUrl('zh', 'a/中文 页')).toBe('/docs/zh/a/%E4%B8%AD%E6%96%87%20%E9%A1%B5')
  })
})
