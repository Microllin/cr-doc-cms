import type { CollectionConfig } from 'payload'
import GithubSlugger from 'github-slugger'
import { pruneNavGroups } from '@/lib/prune-nav-groups'

// 文档集合：每条记录 = 一篇 Markdown 文档
// - content 存 Markdown 源码，前端用 remark/rehype + Shiki 渲染成 VitePress 样式
// - 开启 drafts 得到「草稿 / 版本历史 / 预览」
// - title / content / excerpt 开启 localized，对应多语言文档
export const Docs: CollectionConfig = {
  slug: 'docs',
  labels: {
    singular: { zh: '文档', en: 'Document' },
    plural: { zh: '文档', en: 'Documents' },
  },
  admin: {
    group: { zh: '内容', en: 'Content' },
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'updatedAt', '_status'],
    components: {
      // 常驻操作条：批量删除 / 删除全部，不必先勾选才看得见
      beforeListTable: ['/components/admin/ListToolbar#DocsListToolbar'],
    },
    description: {
      zh: '文档内容用 Markdown 编写，slug 是访问路径（如 about/intro）。',
      en: 'Content is written in Markdown. The slug is the URL path (e.g. about/intro).',
    },
  },
  access: {
    // 未登录只能读到已发布的：返回一个查询约束，Payload 会把它并进 where。
    //
    // 之前写的是 read: () => true，注释说「草稿仅登录用户可见（Payload drafts 默认行为）」——
    // 但 Payload 并没有这个默认行为。实测 /api/docs 不带任何条件就能把 _status=draft
    // 的文档原样返回给匿名请求，于是「取消发布」对外等于没发生，未定稿的内容照样公开。
    read: ({ req: { user } }) => {
      if (user) return true
      return { _status: { equals: 'published' } }
    },
  },
  versions: {
    drafts: {
      autosave: false,
    },
    maxPerDoc: 20,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
      label: { zh: '标题', en: 'Title' },
      admin: {
        components: {
          Cell: '/components/admin/DocTitleCell#DocTitleCell',
        },
        description: {
          zh: '页面标题，显示在正文顶部与侧边栏。',
          en: 'Shown at the top of the page and in the sidebar.',
        },
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: { zh: '访问路径 slug', en: 'Slug' },
      admin: {
        position: 'sidebar',
        description: {
          zh: '访问路径，如 about/intro（不含语言前缀）。留空则按标题自动生成。',
          en: 'URL path such as about/intro (no language prefix). Generated from the title if left empty.',
        },
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      localized: true,
      label: { zh: '摘要', en: 'Excerpt' },
      admin: {
        position: 'sidebar',
        description: {
          zh: '摘要，用于搜索结果与 SEO。',
          en: 'Used in search results and SEO metadata.',
        },
      },
    },
    {
      name: 'content',
      type: 'textarea',
      localized: true,
      label: { zh: '正文', en: 'Content' },
      admin: {
        description: {
          zh: 'Markdown 源码。支持 GFM、代码块（Shiki 高亮）、标题自动锚点。',
          en: 'Markdown source. Supports GFM, code blocks (Shiki highlighting) and automatic heading anchors.',
        },
        rows: 24,
      },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data && !data.slug && data.title) {
          data.slug = new GithubSlugger().slug(String(data.title))
        }
        return data
      },
    ],
    afterOperation: [
      // 删除文档后，清掉侧边栏里指向它的条目，并丢掉被删空的分组。
      //
      // 具体取舍见 lib/prune-nav-groups.ts —— 那段逻辑单独拎出来了，有单测。
      //
      // 为什么是 afterOperation 而不是 afterDelete —— 这正是「批量删除报成功却什么都没删」的病根：
      // Payload 对每个被删文档并发跑 afterDelete（Promise.all），
      // 于是 N 个钩子在同一个事务里同时 updateGlobal('navigation') 抢写同一行，
      // 撞上唯一约束报「值必须是唯一的：id」。
      // 一旦事务里出过错，Postgres 就会把整个事务标记为中止 —— 删除被整体回滚，
      // 可 catch 住异常的钩子让 Payload 以为一切正常，照样返回 200 和「已成功删除 N 个」。
      // 结果就是：界面说删好了，刷新一看一条没少。
      //
      // afterOperation 每次操作只跑一次（单删和批删都覆盖），一次读、一次写，
      // 没有并发，也就没有那场竞争。
      //
      // 另外刻意不再吞掉异常：清理失败会连带删除一起回滚，
      // 这时候必须让人看见报错，而不是收获一个假的「删除成功」。
      async ({ operation, req, result }) => {
        if (operation !== 'delete' && operation !== 'deleteByID') return result

        // 批删的 result 是 { docs, errors }，单删的 result 就是那篇文档
        const deleted =
          operation === 'delete'
            ? ((result as { docs?: { id: number | string }[] })?.docs ?? [])
            : [result as { id: number | string }]
        const deletedIds = new Set(deleted.filter(Boolean).map((d) => String(d.id)))
        if (deletedIds.size === 0) return result

        const { payload } = req

        // 显式指定 locale 并保留每行的 id，避免写回时动到另一个语言的分组标题。
        // fallbackLocale: false 同样不能省：localization.fallback 开着的时候，
        // 某个分组若只填了英文标题，按 zh 读会把英文顶上来，原样写回就等于
        // 把英文标题永久刻进中文字段 —— 删一篇文档，顺手改了别人的导航文案。
        const nav = await payload.findGlobal({
          slug: 'navigation',
          depth: 0,
          locale: 'zh',
          fallbackLocale: false,
          req,
        })

        // 摘掉指向已删文档的条目，并把因此变空的分组一并丢掉（见 pruneNavGroups 的注释）
        const { groups, removedItems, droppedGroups } = pruneNavGroups(nav?.groups, deletedIds)

        if (removedItems + droppedGroups > 0) {
          await payload.updateGlobal({
            slug: 'navigation',
            data: { groups },
            locale: 'zh',
            req,
          })
        }

        return result
      },
    ],
  },
}
