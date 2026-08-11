'use client'

import { useEffect, useState } from 'react'
import type { TocItem } from '../_lib/markdown'
import type { Locale } from '../_lib/locale'

// 右侧「On this page」目录 + 滚动高亮
// 用 IntersectionObserver 监听正文标题，滚到哪个高亮哪个 —— VitePress 手感关键
export function TocAside({ items, locale }: { items: TocItem[]; locale: Locale }) {
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    if (!items.length) return
    const headings = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => !!el)

    const visible = new Map<string, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.set(e.target.id, e.intersectionRatio)
          else visible.delete(e.target.id)
        }
        // 取当前可见标题里最靠上的一个
        if (visible.size) {
          const firstVisible = headings.find((h) => visible.has(h.id))
          if (firstVisible) setActiveId(firstVisible.id)
        }
      },
      { rootMargin: '0px 0px -70% 0px', threshold: [0, 1] },
    )
    headings.forEach((h) => observer.observe(h))
    return () => observer.disconnect()
  }, [items])

  if (!items.length) return <aside className="vp-aside" />

  return (
    <aside className="vp-aside">
      <div className="vp-aside-inner">
        <div className="vp-aside-title">{locale === 'en' ? 'On this page' : '本页目录'}</div>
        <nav>
          <ul className="vp-toc">
            {items.map((it) => (
              <li key={it.id} style={{ paddingLeft: (it.level - 2) * 12 }}>
                <a
                  href={`#${it.id}`}
                  className={it.id === activeId ? 'active' : ''}
                  onClick={() => setActiveId(it.id)}
                >
                  {it.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  )
}
