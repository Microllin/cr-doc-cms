'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from '@payloadcms/ui'

import type { CustomTranslationsKeys, CustomTranslationsObject } from '@/i18n/custom'

// 后台左侧导航最上方的「Markdown 导入」入口。
//
// 复用 Payload 自己的 .nav-group / .nav__link 类名，而不是自造一套样式：
// 之前它是个带图标的独立方块，直接吊在所有分组上面 —— 全导航里唯一有图标、
// 唯一没有分组标题的东西，边框怎么调都还是像外挂上去的。
// 现在给它一个和「系统 / 内容 / 站点」平级的分组标题，链接走 .nav__link，
// 于是边框、颜色、hover 全都和其它一级菜单共用同一套。
//
// 用客户端组件是为了拿到 usePathname：Payload 只会给它自己管理的菜单项加激活态
// （激活时渲染成带 indicator 的 <div>），我们这个链接它不认，
// 不自己判断的话，人停在导入页时这一项却不高亮，又成了另一种「格格不入」。
export function ImportNavLink() {
  const { t } = useTranslation<CustomTranslationsObject, CustomTranslationsKeys>()
  const pathname = usePathname()
  const isActive = pathname?.startsWith('/admin/import-md')

  const label = <span className="nav__link-label">{t('crDocs:importNavLabel')}</span>

  return (
    <div className="nav-group cr-nav-group">
      <div className="nav-group__label">{t('crDocs:navToolsGroup')}</div>
      <div className="nav-group__content">
        {isActive ? (
          // 与 Payload 激活项同构：<div> + indicator，直接命中同一条激活样式
          <div className="nav__link">
            <div className="nav__link-indicator" />
            {label}
          </div>
        ) : (
          <Link className="nav__link" href="/admin/import-md">
            {label}
          </Link>
        )}
      </div>
    </div>
  )
}

export default ImportNavLink
