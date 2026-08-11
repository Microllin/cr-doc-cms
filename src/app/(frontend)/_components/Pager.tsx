import Link from 'next/link'
import type { PagerLink } from '../_lib/nav'
import type { Locale } from '../_lib/locale'

// 底部上一页 / 下一页翻页器（VPDocFooter）
export function Pager({ prev, next, locale }: { prev: PagerLink; next: PagerLink; locale: Locale }) {
  if (!prev && !next) return null
  return (
    <div className="vp-pager">
      <div className="vp-pager-prev">
        {prev && (
          <Link href={prev.url}>
            <span className="vp-pager-label">{locale === 'en' ? 'Previous page' : '上一页'}</span>
            <span className="vp-pager-title">{prev.title}</span>
          </Link>
        )}
      </div>
      <div className="vp-pager-next">
        {next && (
          <Link href={next.url}>
            <span className="vp-pager-label">{locale === 'en' ? 'Next page' : '下一页'}</span>
            <span className="vp-pager-title">{next.title}</span>
          </Link>
        )}
      </div>
    </div>
  )
}
