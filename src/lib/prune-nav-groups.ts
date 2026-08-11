/**
 * 删文档后清理侧边栏导航的纯逻辑。
 *
 * 单独拎出来是为了能不起 Payload、不连库就测 —— 这段逻辑出过的两次事故
 * （批删假成功、留下空壳分组）都不是接线问题，而是这里的取舍问题，
 * 所以它值得被单测钉住。调用方见 collections/Docs.ts 的 afterOperation。
 */

/** 导航条目里的 doc 引用：depth:0 时是 id，被删后是 null，depth>0 时是对象 */
type DocRef = { id?: unknown } | string | number | null | undefined

export type NavItemLike = { doc?: DocRef }
export type NavGroupLike = { items?: NavItemLike[] | null }

export type PruneResult<G> = {
  /** 清理后的分组列表，可直接回写 updateGlobal */
  groups: G[]
  /** 摘掉的条目数 */
  removedItems: number
  /** 因为条目被摘光而整组丢掉的分组数 */
  droppedGroups: number
}

function refId(ref: DocRef): string | null {
  const raw = ref && typeof ref === 'object' ? (ref as { id?: unknown }).id : ref
  if (raw === null || raw === undefined) return null
  return String(raw)
}

/**
 * 摘掉指向已删文档的条目，并把「因此变空」的分组一并丢掉。
 *
 * 为什么连分组一起丢：删文档时只摘条目、分组留在原地，就会攒出一堆点开是空的标题。
 * 线上真的攒出过 5 个（入门 / 开发者指南 / 管理员手册 / 子用户手册 / 工具接入），
 * 名字又和自动归组高度重合，前台看起来像「同一批文档出现了两套侧边栏」。
 * 前台渲染时已经兜了一层不显示空分组，但那只是遮住症状 —— 后台列表里那些空壳
 * 还在，每次删文档都要有人记得回去手工清，迟早又漏。
 *
 * 刻意只丢「本次删空的」（删前有条目、删后没了），本来就空的分组一律不动：
 * 那可能是编辑刚建好、正准备往里加文档的占位，替他删掉是帮倒忙。
 */
export function pruneNavGroups<G extends NavGroupLike>(
  groups: G[] | null | undefined,
  deletedIds: Set<string>,
): PruneResult<G> {
  let removedItems = 0
  let droppedGroups = 0

  const next: G[] = []
  for (const group of groups ?? []) {
    const before = group.items ?? []
    const items = before.filter((item) => {
      const id = refId(item?.doc)
      // 外键是 ON DELETE SET NULL，所以此刻被删文档的条目 doc 已经是 null；
      // 同时按 id 再兜一层，防止读到的是删除前的快照。
      const keep = id !== null && !deletedIds.has(id)
      if (!keep) removedItems++
      return keep
    })

    if (before.length > 0 && items.length === 0) {
      droppedGroups++
      continue
    }
    next.push({ ...group, items })
  }

  return { groups: next, removedItems, droppedGroups }
}
