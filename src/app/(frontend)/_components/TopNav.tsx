'use client'

import Link from 'next/link'
import { LOCALES, type Locale } from '../_lib/locale'
import { SearchDialog } from './SearchDialog'
import { ThemeToggle } from './ThemeToggle'

// 顶部导航栏（VPNav）：Logo + 搜索 + 语言切换 + 深浅色
export function TopNav({
  locale,
  siteName,
  logoMark,
  logoUrl,
  localeLinks,
}: {
  locale: Locale
  siteName: string
  logoMark: string
  logoUrl?: string | null
  localeLinks?: Partial<Record<Locale, string>>
}) {

  return (
    <header className="vp-nav">
      <div className="vp-nav-inner">
        <Link href={`/docs/${locale}`} className="vp-nav-logo">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="vp-logo-img" src={logoUrl} alt={siteName} />
          ) : (
            <span className="vp-logo-mark">{logoMark}</span>
          )}
          <span className="vp-logo-text">{siteName}</span>
        </Link>

        <div className="vp-nav-right">
          <SearchDialog locale={locale} />

          <div className="vp-locale-switch">
            {LOCALES.map((l) => {
              const href = localeLinks ? localeLinks[l] || null : `/docs/${l}`
              const available = href !== null
              if (!available) {
                return (
                  <span
                    key={l}
                    className="disabled"
                    title={l === 'en' ? '该文档暂无英文版本' : 'This document has no Chinese version'}
                    aria-disabled="true"
                  >
                    {l === 'zh' ? '中' : 'EN'}
                  </span>
                )
              }
              return (
                <Link
                  key={l}
                  href={href!}
                  className={l === locale ? 'active' : ''}
                  prefetch={false}
                >
                  {l === 'zh' ? '中' : 'EN'}
                </Link>
              )
            })}
          </div>

          <ThemeToggle locale={locale} />
        </div>
      </div>
    </header>
  )
}
