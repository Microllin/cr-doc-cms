import type { GlobalConfig } from 'payload'

// 门户导航文案：字段名 = 扁平 key 后缀，flatten 时前缀 `nav.`。
// 多为固定产品名/入口标签，用命名字段而非数组，运营编辑最直观。
export const PortalNav: GlobalConfig = {
  slug: 'portal-nav',
  label: { zh: '门户 · 导航', en: 'Portal · Navigation' },
  admin: { group: { zh: '门户', en: 'Portal' } },
  access: { read: () => true },
  fields: [
    { type: 'row', fields: [
      { name: 'home', type: 'text', localized: true },
      { name: 'products', type: 'text', localized: true },
      { name: 'pricing', type: 'text', localized: true },
      { name: 'about', type: 'text', localized: true },
      { name: 'contact', type: 'text', localized: true },
    ]},
    { type: 'row', fields: [
      { name: 'login', type: 'text', localized: true },
      { name: 'console', type: 'text', localized: true },
      { name: 'more_products', type: 'text', localized: true },
      { name: 'cloudrouter_hub', type: 'text', localized: true },
    ]},
    { type: 'row', fields: [
      { name: 'stage_evaluate', type: 'text', localized: true },
      { name: 'stage_access', type: 'text', localized: true },
      { name: 'stage_govern', type: 'text', localized: true },
      { name: 'stage_scenario', type: 'text', localized: true },
      { name: 'stage_worker', type: 'text', localized: true },
    ]},
    { type: 'row', fields: [
      { name: 'cloudrouter', type: 'text', localized: true },
      { name: 'accesscenter', type: 'text', localized: true },
      { name: 'seccenter', type: 'text', localized: true },
      { name: 'opscenter', type: 'text', localized: true },
    ]},
    { type: 'row', fields: [
      { name: 'modelarena', type: 'text', localized: true },
      { name: 'chatportal', type: 'text', localized: true },
      { name: 'skillhub', type: 'text', localized: true },
      { name: 'devagent', type: 'text', localized: true },
      { name: 'vulnhunter', type: 'text', localized: true },
    ]},
  ],
}
