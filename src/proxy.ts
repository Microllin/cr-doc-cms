import { type NextRequest, NextResponse } from 'next/server'

const ADMIN_LANGUAGE_COOKIE = 'cr-admin-language'
const ADMIN_LANGUAGES = new Set(['zh', 'en'])

/**
 * Payload 的 Localizer 原生只切换内容 locale（?locale=en），不会切后台 UI 的 i18n。
 * 对使用者而言按钮却显示为「语言环境」，结果就是按钮变成 English、页面仍全是中文。
 *
 * 在请求入口把内容 locale 同步成 Accept-Language，并用 cookie 跨页面保持：
 * - 点击 English：内容字段与后台 UI 一起切英文；
 * - 点击中文：两者一起切中文；
 * - 刷新、跳到其它后台页面：沿用上次选择。
 */
export function proxy(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get('locale')
  const saved = request.cookies.get(ADMIN_LANGUAGE_COOKIE)?.value
  const requestedLanguage = ADMIN_LANGUAGES.has(requested || '') ? requested! : undefined
  const language = requestedLanguage || (ADMIN_LANGUAGES.has(saved || '') ? saved! : undefined)

  // 首次访问仍尊重浏览器的 Accept-Language；只有用户主动选择后才覆盖。
  if (!language) return NextResponse.next()

  const headers = new Headers(request.headers)
  headers.set('Accept-Language', language)

  const response = NextResponse.next({ request: { headers } })
  if (requestedLanguage && saved !== requestedLanguage) {
    response.cookies.set(ADMIN_LANGUAGE_COOKIE, requestedLanguage, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      path: '/',
    })
  }
  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
