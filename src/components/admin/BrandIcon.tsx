import React from 'react'

import { BrandMark, getBrand } from './brand'

/**
 * 后台「图标」位：左上角面包屑与登录页顶部的小标记。
 * Payload 默认给的是它自己的品牌标识，换成站点自己的，一眼能认出是哪个后台。
 *
 * 尺寸取 22px：顶栏那个容器比想象中矮，给到 28px 会被裁掉一截。
 */
export async function BrandIcon() {
  const { mark } = await getBrand()
  return <BrandMark mark={mark} size={22} />
}

export default BrandIcon
