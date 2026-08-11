import React from 'react'
import { getPayload } from 'payload'

import config from '@/payload.config'

/**
 * 读站点设置里的品牌信息，供后台图标 / Logo 使用。
 *
 * 登录页是未登录状态下渲染的，所以这里依赖 Settings 的 access.read = () => true。
 * 任何一步出问题都不能把登录页带崩 —— 拿不到就退回默认值，
 * 「Logo 显示成 D」远好过「登录页 500，谁也进不来」。
 */
export async function getBrand(): Promise<{ mark: string; name: string }> {
  try {
    const payload = await getPayload({ config: await config })
    const settings = await payload.findGlobal({ slug: 'settings', depth: 0 })
    const name = (settings?.siteName || '').trim()
    const mark = (settings?.logoMark || '').trim()
    return {
      name: name || 'Docs',
      mark: mark || (name ? name.slice(0, 1).toUpperCase() : 'D'),
    }
  } catch {
    return { mark: 'D', name: 'Docs' }
  }
}

/** 方块字母标记，登录页与左上角共用同一套视觉 */
export function BrandMark({ mark, size }: { mark: string; size: number }) {
  return (
    <span
      aria-hidden="true"
      className="cr-brand__mark"
      style={{
        // 字号跟着方块走，避免两处尺寸各写一遍
        fontSize: Math.round(size * 0.46),
        height: size,
        width: size,
      }}
    >
      {mark}
    </span>
  )
}
