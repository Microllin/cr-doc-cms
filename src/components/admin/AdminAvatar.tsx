import React from 'react'
import type { ServerProps } from 'payload'

/**
 * 右上角账户头像。
 *
 * Payload 默认给的是一个灰色人形剪影（avatar: 'default'），在 26px 下就是一坨灰块，
 * 看不出是谁、也不像是设计过的东西。这里换成邮箱首字母 + 品牌色底，
 * 一眼能确认「我是用哪个账号登进来的」——多环境切着用时这点很重要。
 *
 * 刻意不用 gravatar：那会把用户邮箱的 MD5 发到 gravatar.com，
 * 内网部署既连不上、也不该往外发。
 */
export function AdminAvatar({ user }: ServerProps) {
  const email = typeof user?.email === 'string' ? user.email : ''
  const initial = email.trim().charAt(0).toUpperCase() || '?'

  return (
    <span aria-label={email} className="cr-avatar" title={email}>
      {initial}
    </span>
  )
}

export default AdminAvatar
