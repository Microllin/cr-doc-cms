import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { createHash } from 'crypto'

import { tAdmin } from '@/lib/admin-i18n'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: {
    singular: { zh: '媒体', en: 'Media' },
    plural: { zh: '媒体', en: 'Media' },
  },
  access: {
    read: () => true,
  },
  admin: {
    group: { zh: '内容', en: 'Content' },
    defaultColumns: ['filename', 'alt', 'mimeType', 'filesize', 'updatedAt'],
    components: {
      // 常驻操作条：批量删除 / 删除全部，不必先勾选才看得见
      beforeListTable: ['/components/admin/ListToolbar#MediaListToolbar'],
    },
    description: {
      zh: '文档里用到的图片。内容相同的图片只会入库一份。',
      en: 'Images used in the docs. Byte-identical images are stored only once.',
    },
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      // 保持必填：库里 media.alt 是 NOT NULL，改成可选会造成配置与 schema 漂移。
      // Markdown 导入时由导入器自动填入（取 md 里的 alt 文本，兜底用文件名）。
      required: true,
      label: { zh: '替代文本', en: 'Alt text' },
      admin: {
        description: {
          zh: '图片无法显示时展示的文字，也用于无障碍朗读。',
          en: 'Shown when the image fails to load; also read by screen readers.',
        },
      },
    },
    {
      name: 'sha256',
      type: 'text',
      // 唯一约束是去重的最后一道闸：应用层「先查再写」存在 TOCTOU 窗口，
      // 两个并发上传可能同时查不到、又同时写入。数据库层挡住才是真的挡住。
      // 历史行 sha256 为 NULL，而 Postgres 唯一索引里 NULL 互不相等，因此不受影响。
      unique: true,
      label: { zh: '内容哈希', en: 'Content hash' },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: {
          zh: '文件内容的 SHA-256，上传时自动计算，用于避免同一张图重复入库。',
          en: 'SHA-256 of the file contents, computed on upload to prevent storing the same image twice.',
        },
      },
    },
  ],
  hooks: {
    beforeValidate: [
      // sha256 必须在集合钩子里算，而不是只在 Markdown 导入端点里算。
      //
      // 之前只有导入端点写 sha256，从后台「媒体」页直接上传的图片 sha256 恒为 NULL，
      // 去重对它们完全失效 —— 手工传过的图，导入时还会再入库一份。
      // 放在这里，则不论走哪条路径（后台 UI / REST / 导入端点）都有哈希。
      async ({ data, operation, originalDoc, req }) => {
        if (!data) return data

        const uploaded = req.file?.data

        if (uploaded) {
          data.sha256 = createHash('sha256').update(uploaded).digest('hex')
        } else if (operation === 'update') {
          // 没有重新上传文件就沿用原值。
          // 关键：不能采信请求里带来的 sha256 —— admin.readOnly 只约束后台界面，
          // 直接 PATCH /api/media/:id 照样能塞任意值进来，那唯一约束就形同虚设。
          data.sha256 = originalDoc?.sha256 ?? null
        }

        if (!data.sha256) return data

        // 抢在唯一约束报错之前给一句人话。数据库自己抛的是
        // 「duplicate key value violates unique constraint "media_sha256_idx"」，
        // 对着后台界面的人完全看不懂。
        const clash = await req.payload.find({
          collection: 'media',
          where: {
            sha256: { equals: data.sha256 },
            ...(originalDoc?.id ? { id: { not_equals: originalDoc.id } } : {}),
          },
          limit: 1,
          depth: 0,
          req,
        })

        const hit = clash.docs[0] as { filename?: string } | undefined
        if (hit) {
          throw new APIError(
            tAdmin(req, 'crDocs:errDuplicateImage', { filename: hit.filename ?? '' }),
            409,
          )
        }

        return data
      },
    ],
  },
  upload: true,
}
