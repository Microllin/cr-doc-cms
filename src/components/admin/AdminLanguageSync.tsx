'use client'

import { useEffect } from 'react'

/**
 * Payload 的内容 Localizer 使用客户端 router.push，只替换局部 RSC。
 * 但后台 UI 语言由请求头决定，局部跳转会造成新旧语言混排。
 * 捕获语言选项点击并执行整页导航，让 proxy.ts 在同一次请求中同步内容语言和 UI 语言。
 */
export function AdminLanguageSync() {
  useEffect(() => {
    const switchLanguage = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return

      const option = target.closest('.popup-button-list__button')
      const language = option?.querySelector<HTMLElement>('[data-locale]')?.dataset.locale
      if (language !== 'zh' && language !== 'en') return

      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()

      const url = new URL(window.location.href)
      url.searchParams.set('locale', language)
      window.location.assign(url.toString())
    }

    document.addEventListener('click', switchLanguage, true)
    return () => document.removeEventListener('click', switchLanguage, true)
  }, [])

  return null
}

export default AdminLanguageSync
