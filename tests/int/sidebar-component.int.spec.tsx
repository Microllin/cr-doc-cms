import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import type { NavGroup } from '@/app/(frontend)/_lib/nav'

// usePathname 用一个可改的变量喂：这组用例的全部要点就是「路径变了以后展开状态跟不跟着变」
let pathname = '/docs/zh/a'
vi.mock('next/navigation', () => ({ usePathname: () => pathname }))
// next/link 在 jsdom 里需要 router context，测展开逻辑不必把它拖进来
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const { Sidebar } = await import('@/app/(frontend)/_components/Sidebar')

const link = (slug: string, title = slug) => ({ title, slug, url: `/docs/zh/${slug}` })
const group = (label: string, items: string[], extra: Partial<NavGroup> = {}): NavGroup => ({
  label,
  collapsed: true,
  items: items.map((s) => link(s)),
  ...extra,
})

/** 读出每个分组标题当前的展开状态 */
const openState = () =>
  Object.fromEntries(
    [...document.querySelectorAll<HTMLElement>('.vp-sidebar-heading')].map((el) => [
      el.querySelector('span')?.textContent?.trim(),
      el.getAttribute('aria-expanded') === 'true',
    ]),
  )

const heading = (label: string) =>
  [...document.querySelectorAll<HTMLElement>('.vp-sidebar-heading')].find(
    (el) => el.querySelector('span')?.textContent?.trim() === label,
  )!

beforeEach(() => {
  pathname = '/docs/zh/a'
})
afterEach(cleanup)

describe('Sidebar 展开哪一支', () => {
  it('默认只展开含当前页的分组，其余保持收起', () => {
    pathname = '/docs/zh/b1'
    render(<Sidebar groups={[group('甲', ['a1', 'a2']), group('乙', ['b1'])]} />)
    expect(openState()).toEqual({ 甲: false, 乙: true })
    expect(screen.getByText('b1')).toHaveProperty('className', 'active')
  })

  it('收起的分组不渲染条目 —— 不是靠 CSS 藏', () => {
    pathname = '/docs/zh/b1'
    render(<Sidebar groups={[group('甲', ['a1']), group('乙', ['b1'])]} />)
    expect(screen.queryByText('a1')).toBeNull()
    expect(screen.queryByText('b1')).not.toBeNull()
  })

  // 库里目前没有二层目录，浏览器实测覆盖不到这条递归；这里补上
  it('当前页在子分组里时，祖先链逐级展开', () => {
    pathname = '/docs/zh/deep'
    const nested: NavGroup = group('外', ['outer'], {
      children: [group('中', [], { children: [group('内', ['deep'])] })],
    })
    render(<Sidebar groups={[nested, group('隔壁', ['x'])]} />)
    expect(openState()).toEqual({ 外: true, 中: true, 内: true, 隔壁: false })
    expect(screen.getByText('deep')).toHaveProperty('className', 'active')
  })

  it('当前页不在这一支里时，子分组不会被顺带展开', () => {
    pathname = '/docs/zh/outer'
    const nested: NavGroup = group('外', ['outer'], { children: [group('内', ['deep'])] })
    render(<Sidebar groups={[nested]} />)
    expect(openState()).toEqual({ 外: true, 内: false })
  })

  it('后台勾了「不折叠」的手工分组照旧展开，即使不含当前页', () => {
    pathname = '/docs/zh/别处'
    render(<Sidebar groups={[group('常开', ['a1'], { collapsed: false })]} />)
    expect(openState()).toEqual({ 常开: true })
  })
})

describe('Sidebar 当前页匹配（中文 slug 的编码差异）', () => {
  it('pathname 是百分号编码、链接是中文原串，也算同一页', () => {
    pathname = `/docs/zh/${encodeURIComponent('入门')}`
    render(<Sidebar groups={[{ label: '组', collapsed: true, items: [link('入门')] }]} />)
    expect(openState()).toEqual({ 组: true })
    expect(screen.getByText('入门')).toHaveProperty('className', 'active')
  })

  it('反过来（pathname 未编码、链接已编码）同样能对上', () => {
    pathname = '/docs/zh/入门'
    const items = [{ title: '入门', slug: '入门', url: `/docs/zh/${encodeURIComponent('入门')}` }]
    render(<Sidebar groups={[{ label: '组', collapsed: true, items }]} />)
    expect(openState()).toEqual({ 组: true })
  })

  it('路径里带裸 % 时不炸（safeDecode 兜住 URIError）', () => {
    pathname = '/docs/zh/100%'
    expect(() =>
      render(<Sidebar groups={[{ label: '组', collapsed: true, items: [link('100%')] }]} />),
    ).not.toThrow()
  })
})

describe('Sidebar 手动折叠与换页的关系', () => {
  it('可以手动展开收起的分组，也可以手动收起当前分组', () => {
    pathname = '/docs/zh/b1'
    render(<Sidebar groups={[group('甲', ['a1']), group('乙', ['b1'])]} />)

    fireEvent.click(heading('甲'))
    expect(openState()).toEqual({ 甲: true, 乙: true })
    expect(screen.queryByText('a1')).not.toBeNull()

    fireEvent.click(heading('乙'))
    expect(openState()).toEqual({ 甲: true, 乙: false })
  })

  // 这是 useState 初值那个 bug 的单测版：软跳转不会重挂组件，
  // 状态若不跟着 pathname 走，跳过去的那篇文档在侧边栏里根本看不见。
  //
  // 要有区分力，手动状态必须和「跟着当前页走」推出来的结果相反：
  // 所以先手动收起当前分组，再跳到同一个分组里的另一篇 ——
  // override 若不绑 pathname，这一支会一直收着，b2 看不见。
  it('手动收起后跳到同分组的另一篇，该分组重新展开', () => {
    pathname = '/docs/zh/b1'
    const groups = [group('甲', ['a1']), group('乙', ['b1', 'b2'])]
    const { rerender } = render(<Sidebar groups={groups} />)
    expect(openState()).toEqual({ 甲: false, 乙: true })

    fireEvent.click(heading('乙'))
    expect(openState()).toEqual({ 甲: false, 乙: false })

    pathname = '/docs/zh/b2'
    rerender(<Sidebar groups={groups} />)
    expect(openState()).toEqual({ 甲: false, 乙: true })
    expect(screen.getByText('b2')).toHaveProperty('className', 'active')
  })

  it('回到手动收起过的那一页，手动状态仍然生效（override 是按页记的）', () => {
    pathname = '/docs/zh/b1'
    const groups = [group('甲', ['a1']), group('乙', ['b1', 'b2'])]
    const { rerender } = render(<Sidebar groups={groups} />)

    fireEvent.click(heading('乙'))
    pathname = '/docs/zh/b2'
    rerender(<Sidebar groups={groups} />)
    expect(openState()).toEqual({ 甲: false, 乙: true })

    pathname = '/docs/zh/b1'
    rerender(<Sidebar groups={groups} />)
    expect(openState()).toEqual({ 甲: false, 乙: false })
  })

  it('换页到原本收起的分组，该分组自动展开且当前页可见', () => {
    pathname = '/docs/zh/a1'
    const groups = [group('甲', ['a1']), group('乙', ['b1'])]
    const { rerender } = render(<Sidebar groups={groups} />)
    expect(openState()).toEqual({ 甲: true, 乙: false })

    pathname = '/docs/zh/b1'
    rerender(<Sidebar groups={groups} />)
    expect(openState()).toEqual({ 甲: false, 乙: true })
    expect(screen.getByText('b1')).toHaveProperty('className', 'active')
  })
})
