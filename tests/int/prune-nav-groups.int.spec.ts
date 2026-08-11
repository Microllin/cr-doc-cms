import { describe, it, expect } from 'vitest'
import { pruneNavGroups } from '@/lib/prune-nav-groups'

// 造一个分组：items 里给 doc id，null 代表「文档已被删、外键置空」
const G = (items: (string | number | null)[]) => ({
  label: 'g',
  items: items.map((doc) => ({ doc })),
})

describe('pruneNavGroups', () => {
  it('摘掉指向已删文档的条目，留下其余条目', () => {
    const r = pruneNavGroups([G([1, 2, 3])], new Set(['2']))
    expect(r.groups).toHaveLength(1)
    expect(r.groups[0].items.map((i) => i.doc)).toEqual([1, 3])
    expect(r.removedItems).toBe(1)
    expect(r.droppedGroups).toBe(0)
  })

  it('doc 已被外键置成 null 的条目也算被删（ON DELETE SET NULL 的现场）', () => {
    const r = pruneNavGroups([G([1, null, 3])], new Set())
    expect(r.groups[0].items.map((i) => i.doc)).toEqual([1, 3])
    expect(r.removedItems).toBe(1)
  })

  it('id 是数字还是字符串都能对上（Postgres 回来的类型不保证）', () => {
    const r = pruneNavGroups([G(['7', 8])], new Set(['7', '8']))
    expect(r.groups).toHaveLength(0)
    expect(r.removedItems).toBe(2)
  })

  it('depth>0 时 doc 被填成对象，按 .id 比', () => {
    const groups = [{ label: 'g', items: [{ doc: { id: 5, slug: 'a' } }, { doc: { id: 6 } }] }]
    const r = pruneNavGroups(groups, new Set(['5']))
    expect(r.groups[0].items).toHaveLength(1)
    expect(r.groups[0].items[0].doc).toEqual({ id: 6 })
  })

  // 这条是这次修复的正主：那 5 个空壳分组就是「条目被摘光、分组留在原地」攒出来的
  it('被删空的分组整组丢掉，不留空壳', () => {
    const r = pruneNavGroups([G([1, 2]), G([3])], new Set(['1', '2']))
    expect(r.groups).toHaveLength(1)
    expect(r.groups[0].items.map((i) => i.doc)).toEqual([3])
    expect(r.removedItems).toBe(2)
    expect(r.droppedGroups).toBe(1)
  })

  // 反过来也要成立，否则会把编辑刚建好、还没来得及加文档的分组顺手删了
  it('本来就空的分组不动 —— 那可能是有意留的占位', () => {
    const r = pruneNavGroups([G([]), G([1])], new Set(['1']))
    expect(r.groups).toHaveLength(1)
    expect(r.groups[0].items).toEqual([])
    expect(r.droppedGroups).toBe(1)
  })

  it('分组上的其它字段原样保留（collapsed / 标题不能在写回时丢掉）', () => {
    const groups = [{ id: 'row1', label: '入门', collapsed: true, items: [{ doc: 1 }, { doc: 2 }] }]
    const r = pruneNavGroups(groups, new Set(['1']))
    expect(r.groups[0]).toMatchObject({ id: 'row1', label: '入门', collapsed: true })
  })

  it('没删到任何东西时一个都不动（调用方据此跳过写回）', () => {
    const r = pruneNavGroups([G([1, 2])], new Set(['99']))
    expect(r.removedItems).toBe(0)
    expect(r.droppedGroups).toBe(0)
    expect(r.groups[0].items).toHaveLength(2)
  })

  it('导航为空 / 未初始化不炸', () => {
    expect(pruneNavGroups(null, new Set(['1'])).groups).toEqual([])
    expect(pruneNavGroups(undefined, new Set(['1'])).groups).toEqual([])
    // 分组连 items 都还没填（后台刚建好那一瞬间）
    const bare = { label: 'g', items: undefined }
    expect(pruneNavGroups([bare], new Set(['1'])).groups).toHaveLength(1)
  })
})
