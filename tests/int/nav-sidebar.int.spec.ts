import { describe, it, expect, beforeEach, vi } from 'vitest'

// 把 payload 换成假的：这些用例要测的是分组/折叠的取舍，跟数据库没关系。
// 不 mock 就得连库，而 compose 里 db 的端口是注释掉的，本机连不上（见 api.int.spec.ts）。
type FakeDoc = { slug: string; title: string; content?: string; _status?: string }
let navGlobal: unknown = { groups: [] }
let allDocs: FakeDoc[] = []
const findArgs: Record<string, unknown>[] = []

vi.mock('@/payload.config', () => ({ default: Promise.resolve({}) }))
vi.mock('payload', () => ({
  // getPayloadClient 会把 client 缓存起来，所以这里返回的对象必须在调用时
  // 才去读 navGlobal / allDocs，不能提前把值烧死
  getPayload: async () => ({
    findGlobal: async () => navGlobal,
    find: async (args: Record<string, unknown>) => {
      findArgs.push(args)
      return { docs: allDocs }
    },
  }),
}))

const { getSidebar, flattenSidebar, getPager } = await import('@/app/(frontend)/_lib/nav')

const doc = (slug: string, title = slug): FakeDoc => ({
  slug,
  title,
  content: 'content',
  _status: 'published',
})
const labels = (groups: { label: string }[]) => groups.map((g) => g.label)

beforeEach(() => {
  navGlobal = { groups: [] }
  allDocs = []
  findArgs.length = 0
})

describe('getSidebar 手工编排的分组', () => {
  it('保持后台的顺序，并沿用各自的「默认折叠」勾选', async () => {
    navGlobal = {
      groups: [
        { label: '乙组', collapsed: true, items: [{ doc: doc('b') }] },
        { label: '甲组', collapsed: false, items: [{ doc: doc('a') }] },
      ],
    }
    const groups = await getSidebar('zh')
    expect(labels(groups)).toEqual(['乙组', '甲组'])
    expect(groups.map((g) => g.collapsed)).toEqual([true, false])
  })

  it('挂着未发布文档的条目不显示 —— 否则是一条点进去 404 的死链', async () => {
    navGlobal = {
      groups: [
        { label: '甲组', items: [{ doc: doc('a') }, { doc: { slug: 'draft', title: '草稿', _status: 'draft' } }] },
      ],
    }
    const groups = await getSidebar('zh')
    expect(groups[0].items.map((i) => i.slug)).toEqual(['a'])
  })

  // 这条对应线上那 5 个空壳分组：删文档只摘条目、分组留着，前台就多出点开是空的标题
  it('一条都挂不出来的分组整组不渲染', async () => {
    navGlobal = {
      groups: [
        { label: '空壳', items: [{ doc: { slug: 'x', title: 'x', _status: 'draft' } }] },
        { label: '空壳2', items: [] },
        { label: '有货', items: [{ doc: doc('a') }] },
      ],
    }
    expect(labels(await getSidebar('zh'))).toEqual(['有货'])
  })

  it('被手工收录过的文档不再重复出现在自动归组里', async () => {
    navGlobal = { groups: [{ label: '甲组', items: [{ doc: doc('01-入门/01-a') }] }] }
    allDocs = [doc('01-入门/01-a'), doc('01-入门/02-b')]
    const groups = await getSidebar('zh')
    expect(labels(groups)).toEqual(['甲组', '入门'])
    expect(flattenSidebar(groups).map((l) => l.slug)).toEqual(['01-入门/01-a', '01-入门/02-b'])
  })
})

describe('getSidebar 自动归组', () => {
  it('只查已发布 —— 前台走 Local API，集合上的 access 规则对它不生效', async () => {
    await getSidebar('zh')
    expect(findArgs[0]).toMatchObject({ where: { _status: { equals: 'published' } } })
  })

  it('默认全部收起，靠 Sidebar 去展开当前页那一支', async () => {
    allDocs = [doc('01-入门/a'), doc('02-进阶/b')]
    const groups = await getSidebar('zh')
    expect(labels(groups)).toEqual(['入门', '进阶'])
    expect(groups.every((g) => g.collapsed)).toBe(true)
  })

  it('目录名的数字排序前缀不带到界面上', async () => {
    allDocs = [doc('10-十/a'), doc('02-二/b')]
    expect(labels(await getSidebar('zh'))).toEqual(['二', '十'])
  })

  // 库里目前全是一层目录，这条分支平时走不到 —— 正因为走不到才要测
  it('有几层目录就分几级，子分组同样默认收起', async () => {
    allDocs = [doc('01-入门/00-总览'), doc('01-入门/02-进阶/a'), doc('01-入门/02-进阶/03-再往下/b')]
    const groups = await getSidebar('zh')
    expect(labels(groups)).toEqual(['入门'])
    expect(groups[0].items.map((i) => i.slug)).toEqual(['01-入门/00-总览'])

    const sub = groups[0].children ?? []
    expect(labels(sub)).toEqual(['进阶'])
    expect(sub[0].collapsed).toBe(true)

    const subsub = sub[0].children ?? []
    expect(labels(subsub)).toEqual(['再往下'])
    expect(subsub[0].collapsed).toBe(true)
    expect(subsub[0].items.map((i) => i.slug)).toEqual(['01-入门/02-进阶/03-再往下/b'])
  })

  it('没有子目录时不挂空的 children 字段', async () => {
    allDocs = [doc('01-入门/a')]
    expect((await getSidebar('zh'))[0].children).toBeUndefined()
  })

  // 同样是平时走不到的分支：库里现在没有不带斜杠的 slug
  it('不在任何目录下的散篇兜进「未归类」，且默认收起', async () => {
    allDocs = [doc('01-入门/a'), doc('随手写的')]
    const groups = await getSidebar('zh')
    expect(labels(groups)).toEqual(['入门', '未归类'])
    const other = groups[1]
    expect(other.collapsed).toBe(true)
    expect(other.items.map((i) => i.slug)).toEqual(['随手写的'])
  })

  it('英文站的兜底分组叫 Other', async () => {
    allDocs = [doc('loose')]
    expect(labels(await getSidebar('en'))).toEqual(['Other'])
  })

  it('没有散篇就不凭空多出一个「未归类」', async () => {
    allDocs = [doc('01-入门/a')]
    expect(labels(await getSidebar('zh'))).toEqual(['入门'])
  })

  it('URL 按 locale 拼、中文段做百分号编码', async () => {
    allDocs = [doc('01-入门/账户')]
    const [g] = await getSidebar('zh')
    expect(g.items[0].url).toBe(`/docs/zh/${encodeURIComponent('01-入门')}/${encodeURIComponent('账户')}`)
  })
})

describe('上一页 / 下一页', () => {
  it('穿透子分组 —— 只看顶层 items 会整段跳过一个子目录', async () => {
    allDocs = [doc('01-入门/00-总览'), doc('01-入门/02-进阶/a'), doc('02-别的/b')]
    const groups = await getSidebar('zh')
    expect(flattenSidebar(groups).map((l) => l.slug)).toEqual([
      '01-入门/00-总览',
      '01-入门/02-进阶/a',
      '02-别的/b',
    ])

    const mid = getPager(groups, '01-入门/02-进阶/a')
    expect(mid.prev?.title).toBe('01-入门/00-总览')
    expect(mid.next?.title).toBe('02-别的/b')
  })

  it('首尾两端不越界，找不到当前页时两边都给 null', async () => {
    allDocs = [doc('a/1'), doc('a/2')]
    const groups = await getSidebar('zh')
    expect(getPager(groups, 'a/1').prev).toBeNull()
    expect(getPager(groups, 'a/2').next).toBeNull()
    expect(getPager(groups, '不存在')).toEqual({ prev: null, next: null })
  })
})
