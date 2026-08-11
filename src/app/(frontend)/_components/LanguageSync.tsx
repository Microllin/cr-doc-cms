'use client'

import { useEffect } from 'react'
import type { Locale } from '../_lib/locale'

/** 客户端导航时同步根节点语言，供浏览器、朗读器和拼写检查使用。 */
export function LanguageSync({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale === 'en' ? 'en' : 'zh-CN'
  }, [locale])

  return null
}
