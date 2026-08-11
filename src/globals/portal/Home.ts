import type { GlobalConfig } from 'payload'

// 门户首页内容：字段为「干净的结构化 shape」，门户侧 flatten-cms 会把它映射回
// 组件正在使用的扁平 i18n key（如 hero.badge / stats.item_0_value / centers.access_f0）。
// 全部 localized（zh/en）。未在此建模的首页命名空间（productLines/whyUs 等）
// 会自动回退到门户静态 zh.json/en.json —— 增量迁移安全。
export const PortalHome: GlobalConfig = {
  slug: 'portal-home',
  label: { zh: '门户 · 首页', en: 'Portal · Home' },
  admin: { group: { zh: '门户', en: 'Portal' } },
  access: { read: () => true },
  fields: [
    {
      type: 'group',
      name: 'hero',
      label: { zh: '首屏 Hero', en: 'Hero' },
      fields: [
        { name: 'badge', type: 'textarea', localized: true },
        { name: 'line1', type: 'text', localized: true },
        { name: 'line2', type: 'text', localized: true },
        { name: 'subtitle', type: 'textarea', localized: true },
        { name: 'title', type: 'textarea', localized: true },
        { name: 'cta_start', type: 'text', localized: true },
        { name: 'cta_demo', type: 'text', localized: true },
        { name: 'cta_explore', type: 'text', localized: true },
        { name: 'cta_contact', type: 'text', localized: true },
      ],
    },
    {
      type: 'array',
      name: 'stats',
      label: { zh: '数据指标（4 项）', en: 'Statistics (4 items)' },
      fields: [
        { name: 'value', type: 'text', required: true, localized: true },
        { name: 'label', type: 'text', required: true, localized: true },
      ],
    },
    {
      type: 'group',
      name: 'centers',
      label: { zh: '四大治理中心', en: 'Governance centers' },
      fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'subtitle', type: 'textarea', localized: true },
        {
          type: 'array',
          name: 'items',
          label: { zh: '中心', en: 'Centers' },
          admin: {
            description: {
              zh: 'key 决定扁平键前缀：access / sec / ops',
              en: 'The key determines the flattened prefix: access / sec / ops',
            },
          },
          fields: [
            {
              name: 'key',
              type: 'text',
              required: true,
              admin: {
                description: {
                  zh: '如 access / sec / ops，不本地化',
                  en: 'For example access / sec / ops; not localized',
                },
              },
            },
            { name: 'tab', type: 'text', localized: true },
            { name: 'label', type: 'text', localized: true },
            { name: 'desc', type: 'textarea', localized: true },
            {
              type: 'array',
              name: 'features',
              label: { zh: '特性（f0、f1…）', en: 'Features (f0, f1…)' },
              fields: [{ name: 'text', type: 'text', required: true, localized: true }],
            },
          ],
        },
      ],
    },
    {
      type: 'group',
      name: 'values',
      label: { zh: '核心价值', en: 'Core values' },
      fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'subtitle', type: 'textarea', localized: true },
        {
          type: 'array',
          name: 'items',
          label: { zh: '价值项（v0、v1…）', en: 'Value items (v0, v1…)' },
          fields: [
            { name: 'title', type: 'text', required: true, localized: true },
            { name: 'desc', type: 'textarea', localized: true },
            {
              name: 'desc_long',
              type: 'textarea',
              localized: true,
              admin: { description: { zh: '可留空', en: 'Optional' } },
            },
          ],
        },
      ],
    },
    {
      type: 'group',
      name: 'solutions',
      label: { zh: '解决方案', en: 'Solutions' },
      fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'subtitle', type: 'textarea', localized: true },
        {
          type: 'array',
          name: 'items',
          label: {
            zh: '方案（key 决定前缀：enterprise / dev / security / cost）',
            en: 'Solutions (key determines prefix: enterprise / dev / security / cost)',
          },
          fields: [
            { name: 'key', type: 'text', required: true },
            { name: 'title', type: 'text', localized: true },
            { name: 'scene', type: 'textarea', localized: true },
            { name: 'solution', type: 'textarea', localized: true },
            { name: 'centers', type: 'text', localized: true },
          ],
        },
      ],
    },
    {
      type: 'group',
      name: 'moreProducts',
      label: { zh: '更多产品', en: 'More products' },
      fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'subtitle', type: 'textarea', localized: true },
        {
          type: 'array',
          name: 'items',
          label: {
            zh: '产品（key 决定前缀：modelarena / chatportal…）',
            en: 'Products (key determines prefix: modelarena / chatportal…)',
          },
          fields: [
            { name: 'key', type: 'text', required: true },
            { name: 'name', type: 'text', localized: true },
            { name: 'desc', type: 'textarea', localized: true },
            { name: 'status', type: 'text', localized: true },
          ],
        },
      ],
    },
    {
      type: 'group',
      name: 'quickStart',
      label: { zh: '快速开始', en: 'Quick start' },
      fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'subtitle', type: 'textarea', localized: true },
        {
          type: 'array',
          name: 'steps',
          label: { zh: '步骤（step_0、step_1…）', en: 'Steps (step_0, step_1…)' },
          fields: [
            { name: 'title', type: 'text', localized: true },
            { name: 'desc', type: 'textarea', localized: true },
          ],
        },
      ],
    },
  ],
}
