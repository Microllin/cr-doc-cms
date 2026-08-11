import { describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'

import { bulkDocStatusEndpoint } from '@/endpoints/bulkDocStatus'

async function run(req: PayloadRequest) {
  if (!bulkDocStatusEndpoint.handler) throw new Error('missing handler')
  return bulkDocStatusEndpoint.handler(req)
}

function request({
  body,
  docs = [],
  authenticated = true,
}: {
  body: unknown
  docs?: Record<string, unknown>[]
  authenticated?: boolean
}) {
  const payload = {
    find: vi.fn(async () => ({ docs })),
    update: vi.fn(async ({ id }: { id: number | string }) => ({ id })),
  }
  return {
    req: {
      user: authenticated ? { id: 1 } : null,
      payload,
      json: vi.fn(async () => body),
    } as unknown as PayloadRequest,
    payload,
  }
}

describe('混合语言文档批量状态', () => {
  it('中文和英文文档可混合选择后一次发布', async () => {
    const { req, payload } = request({
      body: { ids: [1, 2], locale: 'en', status: 'published' },
      docs: [
        {
          id: 1,
          slug: 'zh-only',
          title: { zh: '中文标题', en: null },
          content: { zh: '中文正文', en: null },
        },
        {
          id: 2,
          slug: 'en-only',
          title: { zh: null, en: 'English title' },
          content: { zh: null, en: 'English content' },
        },
      ],
    })

    const response = await run(req)
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.errors).toEqual([])
    expect(payload.update).toHaveBeenCalledTimes(2)
    expect(payload.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: 1, locale: 'zh', data: { _status: 'published' } }),
    )
    expect(payload.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: 2, locale: 'en', data: { _status: 'published' } }),
    )
  })

  it('两种语言都有时优先使用后台当前语言', async () => {
    const { req, payload } = request({
      body: { ids: [3], locale: 'en', status: 'draft' },
      docs: [
        {
          id: 3,
          slug: 'both',
          title: { zh: '中文', en: 'English' },
          content: { zh: '正文', en: 'Content' },
        },
      ],
    })

    expect((await run(req)).status).toBe(200)
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 3, locale: 'en', data: { _status: 'draft' } }),
    )
  })

  it('标题或正文不完整时拒绝发布并报告具体文档', async () => {
    const { req, payload } = request({
      body: { ids: [4], locale: 'zh', status: 'published' },
      docs: [
        {
          id: 4,
          slug: 'incomplete',
          title: { zh: '只有标题', en: null },
          content: { zh: '', en: null },
        },
      ],
    })

    const response = await run(req)
    const result = await response.json()
    expect(response.status).toBe(207)
    expect(result.errors[0]).toMatchObject({ id: 4 })
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('未登录和非法参数被拒绝', async () => {
    const unauthenticated = request({ body: { ids: [1], status: 'published' }, authenticated: false })
    expect((await run(unauthenticated.req)).status).toBe(401)

    const invalid = request({ body: { ids: [], status: 'bad' } })
    expect((await run(invalid.req)).status).toBe(400)
  })
})
