import React from 'react'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import { DefaultTemplate } from '@payloadcms/next/templates'

import { tI18n } from '@/lib/admin-i18n'
import { ImportMarkdownForm } from './ImportMarkdownForm'

// 自定义后台页面：/admin/import-md
//
// 注意：Payload 的自定义视图默认是公开的，必须自己校验登录态。
//
// 套 DefaultTemplate 是为了拿到后台真正的外壳（左侧导航、顶栏、账户菜单）。
// 之前刻意不套、自己画了个「← 返回后台」链接，结果这一页在视觉和导航上都
// 游离在后台之外：进来就出不去，只能靠那一个链接跳回去。
export function ImportMarkdownView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps) {
  const { locale, permissions, req, visibleEntities } = initPageResult
  const { i18n, payload, user } = req

  if (!user) {
    redirect('/admin/login?redirect=%2Fadmin%2Fimport-md')
  }

  return (
    <DefaultTemplate
      i18n={i18n}
      locale={locale}
      params={params}
      payload={payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={user}
      visibleEntities={visibleEntities}
    >
      <div className="cr-import">
        <header className="cr-import__header">
          <h1>{tI18n(i18n, 'crDocs:importTitle')}</h1>
          <p>{tI18n(i18n, 'crDocs:importSubtitle')}</p>
        </header>
        <ImportMarkdownForm initialLocale={locale?.code} />
      </div>
    </DefaultTemplate>
  )
}

export default ImportMarkdownView
