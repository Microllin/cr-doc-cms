import React from 'react'

// 后台自定义区域用到的图标。
//
// 之前用的是 ✎ ↑ ☰ ↗ 这类字符：省事，但字重和大小完全跟着字体走，
// 和 Payload 自己的线性图标语言对不上；更麻烦的是这些字符在部分
// Windows / 精简版 Linux 字体集下会直接变成豆腐块。
// 统一改成 currentColor 描边的 SVG，尺寸和颜色都可控。

type IconProps = { size?: number }

const base = (size: number) => ({
  fill: 'none' as const,
  height: size,
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 1.6,
  viewBox: '0 0 24 24',
  width: size,
  xmlns: 'http://www.w3.org/2000/svg',
})

/** 新建文档 —— 一支笔 */
export const IconPencil = ({ size = 18 }: IconProps) => (
  <svg {...base(size)} aria-hidden="true">
    <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
    <path d="M14.5 6.5 17.5 9.5" />
  </svg>
)

/** 导入 —— 箭头进托盘 */
export const IconImport = ({ size = 18 }: IconProps) => (
  <svg {...base(size)} aria-hidden="true">
    <path d="M12 3v11" />
    <path d="m7.5 9.5 4.5 4.5 4.5-4.5" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
)

/** 侧边栏 —— 列表 */
export const IconList = ({ size = 18 }: IconProps) => (
  <svg {...base(size)} aria-hidden="true">
    <path d="M4 6h16M4 12h16M4 18h10" />
  </svg>
)

/** 查看站点 —— 外链 */
export const IconExternal = ({ size = 18 }: IconProps) => (
  <svg {...base(size)} aria-hidden="true">
    <path d="M14 4h6v6" />
    <path d="M20 4 11 13" />
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
)
