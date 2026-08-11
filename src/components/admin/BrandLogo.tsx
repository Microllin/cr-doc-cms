import React from 'react'

import { BrandMark, getBrand } from './brand'

/**
 * 后台「Logo」位：登录页正中那块大标识。
 * 带上站点名，避免多个环境（本地 / 测试 / 生产）的登录页长得一模一样、登错了都不知道。
 */
export async function BrandLogo() {
  const { mark, name } = await getBrand()
  return (
    <span className="cr-brand cr-brand--lg">
      <BrandMark mark={mark} size={44} />
      <span className="cr-brand__name">{name}</span>
    </span>
  )
}

export default BrandLogo
