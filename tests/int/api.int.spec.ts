import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { bulkDocStatusEndpoint } from '@/endpoints/bulkDocStatus'

import { describe, it, beforeAll, expect } from 'vitest'
import type { PayloadRequest } from 'payload'

let payload: Payload

// 真实 Payload API 需要独立测试库。默认测试集不应因为开发机没暴露 5432 而失败；
// CI 或本地需要跑这组时显式设置 RUN_DB_TESTS=1 并提供 DATABASE_URL。
const describeWithDatabase = process.env.RUN_DB_TESTS === '1' ? describe : describe.skip

describeWithDatabase('API', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  })

  it('fetches users', async () => {
    const users = await payload.find({
      collection: 'users',
    })
    expect(users).toBeDefined()
  })

  it('publishes a mixed selection of zh-only and en-only documents', async () => {
    const users = await payload.find({ collection: 'users', limit: 1 })
    const ids: (number | string)[] = []
    try {
      const zh = await payload.create({
        collection: 'docs',
        locale: 'zh',
        data: { slug: 'qa-api/mixed-zh', title: '中文标题', content: '中文正文', _status: 'draft' },
      })
      const en = await payload.create({
        collection: 'docs',
        locale: 'en',
        data: { slug: 'qa-api/mixed-en', title: 'English title', content: 'English body', _status: 'draft' },
      })
      ids.push(zh.id, en.id)

      if (!bulkDocStatusEndpoint.handler) throw new Error('missing bulk status handler')
      const response = await bulkDocStatusEndpoint.handler({
        user: users.docs[0],
        payload,
        json: async () => ({ ids, locale: 'en', status: 'published' }),
      } as unknown as PayloadRequest)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.errors).toEqual([])
      expect(result.docs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: zh.id, locale: 'zh' }),
          expect.objectContaining({ id: en.id, locale: 'en' }),
        ]),
      )

      for (const id of ids) {
        const doc = await payload.findByID({ collection: 'docs', id, draft: true })
        expect(doc._status).toBe('published')
      }
    } finally {
      for (const id of ids) await payload.delete({ collection: 'docs', id })
    }
  })
})
