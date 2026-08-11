import type { PayloadRequest } from 'payload'

import type { CustomTranslationsKeys } from '@/i18n/custom'

/** t 函数的最小形状 —— 内置类型只认 Payload 自己的 key，这里放宽到 string */
type LooseT = (key: string, vars?: Record<string, unknown>) => string

/**
 * 在服务端取自定义词条。
 *
 * req.i18n.t 的类型只认 Payload 内置的 key，我们自己加的 crDocs:* 过不了类型检查，
 * 这里收敛成一个带类型的入口，避免每个调用点各自 as 一遍。
 * 运行时 Payload 会把 config.i18n.translations 合并进去，key 是真实存在的。
 */
export function tAdmin(
  req: PayloadRequest,
  key: CustomTranslationsKeys,
  vars?: Record<string, unknown>,
): string {
  return tI18n(req.i18n, key, vars)
}

/**
 * 同上，但用于「拿得到 i18n 却拿不到 req」的场景 —— 后台自定义组件收到的是
 * ServerProps，里面直接给 i18n。
 */
export function tI18n(
  i18n: undefined | { t?: unknown },
  key: CustomTranslationsKeys,
  vars?: Record<string, unknown>,
): string {
  const t = i18n?.t as LooseT | undefined
  // 兜底：拿不到 i18n（极少数内部调用没有 i18n）时别让文案变成崩溃
  return typeof t === 'function' ? t(key, vars) : key
}

/** 把字节数写成人话，用于体积超限的报错 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`
}
