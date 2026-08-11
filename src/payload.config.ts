import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { en } from '@payloadcms/translations/languages/en'
import { zh } from '@payloadcms/translations/languages/zh'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Docs } from './collections/Docs'
import { Navigation } from './globals/Navigation'
import { Settings } from './globals/Settings'
import { PortalHome } from './globals/portal/Home'
import { PortalNav } from './globals/portal/Nav'
import { PortalFooter } from './globals/portal/Footer'
import { importMarkdownEndpoint } from './endpoints/importMarkdown'
import { customTranslations } from './i18n/custom'

// 门户（Nuxt）跨源消费本 CMS 的 REST API，需放行其来源。
// 生产用 PORTAL_ORIGINS（逗号分隔）覆盖，默认含本地开发端口。
const portalOrigins = (process.env.PORTAL_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

// csrf 必须包含「你在浏览器里打开后台时用的那个源」，否则登录成功后 cookie
// 不被认，表现为「闪一下又弹回登录页」（/api/users/me 返回 user:null）。
// 之前 csrf 只有 portalOrigins，后台跑在 :8300 却不在名单里，后台整个进不去。
//
// ADMIN_ORIGINS=* 表示不限制来源（等同于 2026-07-27 之前没有 csrf 配置时的行为）。
// 用 IP / 域名 / 端口转发等多种方式访问后台时，逐一枚举来源很容易漏，
// 漏了就是"登录不进去"，排查成本远高于收益，所以给一个明确的放开开关。
//
// 刻意不用 PAYLOAD_PUBLIC_SERVER_URL 来推导：设了 serverURL 会让 media 的 url
// 变成绝对地址，之后换域名/换端口访问就全部失效。这里只影响 csrf，互不牵连。
const adminOrigins = (process.env.ADMIN_ORIGINS || 'http://localhost:8300')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const allowAnyAdminOrigin = adminOrigins.includes('*')
const csrfOrigins = Array.from(new Set([...portalOrigins, ...adminOrigins]))

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || undefined,
  cors: portalOrigins,
  // undefined = 不做来源限制（ADMIN_ORIGINS=* 时）
  csrf: allowAnyAdminOrigin ? undefined : csrfOrigins,
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    // 浏览器标签与登录页的品牌信息。
    // 不设 titleSuffix 时每个标签页都叫「… - Payload」，一排后台开着分不清哪个是哪个。
    meta: {
      titleSuffix: ' · 文档后台',
      icons: [{ rel: 'icon', type: 'image/svg+xml', url: '/admin-icon.svg' }],
    },
    // 右上角头像：默认的灰色人形剪影在 26px 下就是一坨灰块，换成邮箱首字母色块
    avatar: {
      Component: '/components/admin/AdminAvatar#AdminAvatar',
    },
    components: {
      // 后台左侧导航上方的入口
      beforeNavLinks: [
        '/components/admin/AdminLanguageSync#AdminLanguageSync',
        '/components/ImportNavLink#ImportNavLink',
      ],
      // 登录页大图标 + 左上角小图标，替掉 Payload 默认的品牌标识
      graphics: {
        Icon: '/components/admin/BrandIcon#BrandIcon',
        Logo: '/components/admin/BrandLogo#BrandLogo',
      },      // 仪表盘顶部的快捷入口，比默认那排集合卡片更贴合日常动作
      beforeDashboard: ['/components/admin/DashboardQuickActions#DashboardQuickActions'],
      views: {
        importMarkdown: {
          Component: '/components/ImportMarkdownView#ImportMarkdownView',
          path: '/import-md',
          exact: true,
        },
      },
    },
  },
  // 自定义端点：Markdown 导入（图片自动入库 + 引用重写）
  endpoints: [importMarkdownEndpoint],
  collections: [Users, Media, Docs],
  globals: [Navigation, Settings, PortalHome, PortalNav, PortalFooter],
  // 多语言：中文默认 + 英文，缺失时回退到默认语言
  localization: {
    locales: [
      { label: '中文', code: 'zh' },
      { label: 'English', code: 'en' },
    ],
    defaultLocale: 'zh',
    fallback: true,
  },
  editor: lexicalEditor(),
  // 后台界面语言：默认中文。
  // 不配这一项时 Payload 后台 chrome 全是英文（Save / Delete / Create New…），
  // 集合标签写成中文也只是「中英混排」。zh 词条来自 @payloadcms/translations。
  // 保留 en 是为了单个用户仍可在「账户」里自己切回英文。
  //
  // translations 是我们自己加的 crDocs:* 词条（Markdown 导入页、快捷入口、
  // 自定义报错）。不挂在这里的话，切成 English 的用户会在满屏英文里
  // 撞见几块中文 —— 那正是「切了语言但没真正切干净」的观感来源。
  i18n: {
    fallbackLanguage: 'zh',
    supportedLanguages: { zh, en },
    translations: customTranslations,
  },
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  plugins: [],
})
