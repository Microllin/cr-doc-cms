import type { GlobalConfig } from 'payload'

// 站点设置：站点名称 / Logo / 描述，可在后台 /admin 里随时修改
export const Settings: GlobalConfig = {
  slug: 'settings',
  label: { zh: '站点设置', en: 'Site settings' },
  admin: { group: { zh: '站点', en: 'Site' } },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'siteName',
      type: 'text',
      required: true,
      localized: true,
      defaultValue: 'Docs',
      label: { zh: '站点名称', en: 'Site name' },
      admin: {
        description: {
          zh: '显示在左上角 Logo 旁与浏览器标签标题。',
          en: 'Shown next to the logo and in the browser tab title.',
        },
      },
    },
    {
      name: 'logoMark',
      type: 'text',
      defaultValue: 'D',
      label: { zh: 'Logo 字母', en: 'Logo initials' },
      admin: {
        description: {
          zh: 'Logo 方块里的字母/字，建议 1~2 个字符。未上传 Logo 图片时使用。',
          en: 'One or two characters shown in the logo square when no logo image is uploaded.',
        },
      },
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      label: { zh: 'Logo 图片', en: 'Logo image' },
      admin: {
        description: {
          zh: '上传后替代左上角的字母方块（建议高度 32px 左右的 PNG/SVG）。',
          en: 'Replaces the letter square in the top-left corner. PNG/SVG around 32px tall works best.',
        },
      },
    },
    {
      name: 'favicon',
      type: 'upload',
      relationTo: 'media',
      label: { zh: '站点图标 favicon', en: 'Favicon' },
      admin: {
        description: {
          zh: '浏览器标签页图标（建议 .ico / .png / .svg，正方形）。',
          en: 'Browser tab icon — a square .ico / .png / .svg.',
        },
      },
    },
    {
      name: 'description',
      type: 'textarea',
      localized: true,
      label: { zh: 'SEO 描述', en: 'SEO description' },
      admin: {
        description: {
          zh: '用于搜索引擎与分享预览。',
          en: 'Used by search engines and link previews.',
        },
      },
    },
  ],
}
