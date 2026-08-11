'use client'

import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'

// 深浅色切换按钮（复刻 VitePress 右上角的 appearance 切换）
export function ThemeToggle({ locale }: { locale: 'zh' | 'en' }) {
  const { resolvedTheme, setTheme } = useTheme()
  // 服务端快照为 false，客户端首次订阅后为 true，避免用 effect 同步 setState。
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  )

  const isDark = resolvedTheme === 'dark'
  const label = locale === 'en' ? 'Toggle color theme' : '切换深浅色'

  return (
    <button
      className="vp-theme-toggle"
      aria-label={label}
      title={label}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {mounted && isDark ? <MoonIcon /> : <SunIcon />}
    </button>
  )
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}
