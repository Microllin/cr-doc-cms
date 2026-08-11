'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import type { NavGroup } from '../_lib/nav'

// 左侧导航（VPSidebar）：分组可折叠 + 当前页高亮
export function Sidebar({ groups }: { groups: NavGroup[] }) {
  return (
    <aside className="vp-sidebar">
      <nav className="vp-sidebar-nav">
        {groups.map((g, i) => (
          <SidebarGroup depth={0} key={i} group={g} />
        ))}
      </nav>
    </aside>
  )
}

/** 解不开就原样返回：路径里本来就允许出现 %，硬解会抛 URIError 把整个侧边栏带崩 */
function safeDecode(s: string): string {
  if (!s.includes('%')) return s
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

/**
 * 两边都归一到「解码后」再比：usePathname 与 it.url 是否带百分号编码
 * 并不保证一致（slug 可能是中文），只比原串会漏掉匹配。
 */
function samePath(a: string, b: string): boolean {
  return a === b || safeDecode(a) === safeDecode(b)
}

/** 当前页是否落在这个分组里（含任意深度的子分组）—— 决定默认要不要展开 */
function containsPath(group: NavGroup, pathname: string): boolean {
  if (group.items.some((it) => samePath(it.url, pathname))) return true
  return (group.children ?? []).some((child) => containsPath(child, pathname))
}

function SidebarGroup({ depth, group }: { depth: number; group: NavGroup }) {
  const pathname = usePathname()

  // 默认展开规则：分组含当前页就展开，否则听 collapsed。
  // 自动归组的 collapsed 一律为 true（见 nav.ts），于是进任何一篇文档，
  // 侧边栏只摊开它所在的那一支，其余分组保持收起。
  //
  // 手动折叠状态刻意绑在 pathname 上，换页即失效、回落到「跟着当前页走」。
  // 若照原样只用一个 useState(!group.collapsed)：客户端跳转并不会重新挂载这个组件，
  // 初值算过一次就再也不更新 —— 点进另一个分组里的文档，那个分组仍然是收着的，
  // 当前页在侧边栏里根本看不见，还得自己再去点开。
  const [override, setOverride] = useState<{ path: string; open: boolean } | null>(null)
  const open =
    override?.path === pathname
      ? override.open
      : containsPath(group, pathname) || !group.collapsed

  return (
    <div className={`vp-sidebar-group vp-sidebar-group--d${depth}`}>
      <button
        className="vp-sidebar-heading"
        aria-expanded={open}
        onClick={() => setOverride({ path: pathname, open: !open })}
      >
        <span>{group.label}</span>
        <span className={`vp-caret ${open ? 'open' : ''}`} aria-hidden>
          ›
        </span>
      </button>
      {open && (
        <>
          {group.items.length > 0 && (
            <ul className="vp-sidebar-items">
              {group.items.map((it) => {
                const active = samePath(pathname, it.url)
                return (
                  <li key={it.url}>
                    <Link href={it.url} className={active ? 'active' : ''}>
                      {it.title}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
          {/* 子目录：递归渲染，depth 只用来控制缩进 */}
          {(group.children ?? []).map((child, i) => (
            <SidebarGroup depth={depth + 1} group={child} key={`${child.label}-${i}`} />
          ))}
        </>
      )}
    </div>
  )
}
