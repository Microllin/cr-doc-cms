'use client'

import Link from 'next/link'
import type { DefaultCellComponentProps, TextFieldClient } from 'payload'
import { useLocale } from '@payloadcms/ui'

/**
 * localized 标题在目标语言缺失时，Payload 默认渲染成一格空白。
 * 这很容易被误认为导入器没有解析标题。这里不回退另一语言的内容，
 * 只明确提示缺少哪种语言，并附上非本地化 slug 方便识别记录。
 */
export function DocTitleCell({
  cellData,
  linkURL,
  rowData,
}: DefaultCellComponentProps<TextFieldClient>) {
  const locale = useLocale()
  const title = typeof cellData === 'string' ? cellData.trim() : ''
  const slug = typeof rowData?.slug === 'string' ? rowData.slug : ''
  const label = title || `${locale?.code === 'en' ? 'No English title' : '暂无中文标题'}${slug ? ` · ${slug}` : ''}`

  return linkURL ? <Link href={linkURL}>{label}</Link> : <span>{label}</span>
}

export default DocTitleCell
