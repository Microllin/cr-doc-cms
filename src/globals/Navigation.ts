import type { GlobalConfig } from 'payload'

// 侧边栏导航树：1:1 对应 VitePress 的 sidebar 配置
// groups = 分组（可折叠），每组 items 指向具体文档
// 前端据此渲染左侧导航，并按扁平顺序推导每页的上一页 / 下一页
export const Navigation: GlobalConfig = {
  slug: 'navigation',
  label: { zh: '侧边栏导航', en: 'Sidebar navigation' },
  admin: { group: { zh: '内容', en: 'Content' } },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'groups',
      type: 'array',
      label: { zh: '导航分组', en: 'Navigation groups' },
      labels: {
        singular: { zh: '分组', en: 'Group' },
        plural: { zh: '分组', en: 'Groups' },
      },
      admin: {
        description: {
          zh: '每个分组是侧边栏里一个可折叠的标题，下面挂若干文档。',
          en: 'Each group is a collapsible heading in the sidebar with documents under it.',
        },
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
          localized: true,
          label: { zh: '分组标题', en: 'Group title' },
        },
        {
          name: 'collapsed',
          type: 'checkbox',
          label: { zh: '默认折叠', en: 'Collapsed by default' },
          defaultValue: false,
        },
        {
          name: 'items',
          type: 'array',
          label: { zh: '文档项', en: 'Documents' },
          labels: {
            singular: { zh: '文档项', en: 'Document' },
            plural: { zh: '文档项', en: 'Documents' },
          },
          fields: [
            {
              name: 'doc',
              type: 'relationship',
              relationTo: 'docs',
              // 刻意「不」加 required —— Payload 会据此把 doc_id 生成 NOT NULL，
              // 而关联字段的外键一律是 ON DELETE SET NULL，两者互相矛盾：
              // 删除任何被侧边栏引用的文档时，Postgres 试图把 doc_id 置空 →
              // 违反非空约束 → 整个删除事务回滚 → 文档永远删不掉。
              // 空条目由 Docs 的 afterDelete 钩子清理，前台 nav.ts 也会跳过。
              label: { zh: '关联文档', en: 'Linked document' },
            },
          ],
        },
      ],
    },
  ],
}
