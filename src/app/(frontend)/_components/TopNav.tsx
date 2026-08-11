'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LOCALES, type Locale } from '../_lib/locale'
import { SearchDialog } from './SearchDialog'
import { ThemeToggle } from './ThemeToggle'

// 顶部导航栏（VPNav）：Logo + 搜索 + 语言切换 + 深浅色
export function TopNav({
  locale,
  siteName,
  logoMark,
  logoUrl,
  availableLocales,
}: {
  locale: Locale
  siteName: string
  logoMark: string
  logoUrl?: string | null
  availableLocales?: Locale[]
}) {
  const pathname = usePathname()

  // 语言切换：把路径里的 locale 段替换掉，停留在同一页
  function switchLocaleHref(target: Locale) {
    const parts = pathname.split('/').filter(Boolean) // ['docs','zh','guide','intro']
    if (parts[0] === 'docs') {
      if (LOCALES.includes(parts[1] as Locale)) parts[1] = target
      else parts.splice(1, 0, target)
      return '/' + parts.join('/')
    }
    return `/docs/${target}`
  }

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
              const available = l === locale || availableLocales?.includes(l) !== false
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
                  href={switchLocaleHref(l)}
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
