import type { GlobalConfig } from 'payload'

// 门户页脚文案：字段名 = 扁平 key 后缀，flatten 时前缀 `footer.`。
export const PortalFooter: GlobalConfig = {
  slug: 'portal-footer',
  label: { zh: '门户 · 页脚', en: 'Portal · Footer' },
  admin: { group: { zh: '门户', en: 'Portal' } },
  access: { read: () => true },
  fields: [
    { name: 'description', type: 'textarea', localized: true },
    { type: 'row', fields: [
      { name: 'products', type: 'text', localized: true },
      { name: 'centers', type: 'text', localized: true },
      { name: 'more', type: 'text', localized: true },
      { name: 'company', type: 'text', localized: true },
      { name: 'resources', type: 'text', localized: true },
    ]},
    { type: 'row', fields: [
      { name: 'status', type: 'text', localized: true },
      { name: 'docs', type: 'text', localized: true },
    ]},
    { name: 'copyright', type: 'text', localized: true },
  ],
}
