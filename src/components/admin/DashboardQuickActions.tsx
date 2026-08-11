import React from 'react'
import type { ServerProps } from 'payload'

import { tI18n } from '@/lib/admin-i18n'
import { IconExternal, IconImport, IconList, IconPencil } from './icons'

// 仪表盘顶部的快捷入口。
//
// Payload 默认的首页是一排「集合卡片」，按数据结构罗列（文档 / 媒体 / 用户）。
// 但日常打开后台想干的事就那么几件：写一篇、导一批、调导航顺序、去前台看看效果。
// 这一块按「动作」组织，省掉每次先在左侧目录里找入口的那两步。
const ACTIONS = [
  { href: '/admin/collections/docs/create', Icon: IconPencil, key: 'WriteDoc' },
  { href: '/admin/import-md', Icon: IconImport, key: 'Import' },
  { href: '/admin/globals/navigation', Icon: IconList, key: 'Sidebar' },
  { external: true, href: '/docs/zh', Icon: IconExternal, key: 'ViewSite' },
] as const

export function DashboardQuickActions({ i18n }: ServerProps) {
  return (
    <section className="cr-quick">
      <h2 className="cr-quick__title">{tI18n(i18n, 'crDocs:quickActions')}</h2>
      <div className="cr-quick__grid">
        {ACTIONS.map(({ Icon, ...action }) => (
          <a
            className="cr-quick__card"
            href={action.href}
            key={action.key}
            // 去前台是「离开后台」，开新标签，别把正在编辑的东西顶掉
            {...('external' in action && action.external
              ? { rel: 'noreferrer', target: '_blank' }
              : {})}
          >
            <span className="cr-quick__icon">
              <Icon />
            </span>
            <span className="cr-quick__text">
              <strong>{tI18n(i18n, `crDocs:quick${action.key}` as 'crDocs:quickImport')}</strong>
              <small>
                {tI18n(i18n, `crDocs:quick${action.key}Hint` as 'crDocs:quickImportHint')}
              </small>
            </span>
          </a>
        ))}
      </div>
    </section>
  )
}

export default DashboardQuickActions
