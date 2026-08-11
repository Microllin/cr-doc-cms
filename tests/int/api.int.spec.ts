import { getPayload, Payload } from 'payload'
import config from '@/payload.config'

import { describe, it, beforeAll, expect } from 'vitest'

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
})
