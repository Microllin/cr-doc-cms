import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'

vi.mock('@/lib/admin-i18n', () => ({
  formatBytes: (bytes: number) => String(bytes),
  tAdmin: (_req: unknown, key: string) => key,
}))

const { importMarkdownEndpoint } = await import('@/endpoints/importMarkdown')

type FakeFile = {
  name: string
  size: number
  type: string
  arrayBuffer: () => Promise<ArrayBuffer>
}

type RequestOptions = {
  authenticated?: boolean
  files?: FakeFile[]
  paths?: string[]
  values?: Record<string, string>
  formDataError?: boolean
}

function file(name: string, content: string, type = '', declaredSize?: number): FakeFile {
  const bytes = new TextEncoder().encode(content)
  return {
    name,
    size: declaredSize ?? bytes.byteLength,
    type,
    arrayBuffer: vi.fn(async () => bytes.buffer),
  }
}

function request(payload: Record<string, unknown>, options: RequestOptions = {}) {
  const values = new Map<string, unknown>(Object.entries(options.values ?? {}))
  const files = options.files ?? [
    file('page.md', '# Page\n\n![图](a.png)', 'text/markdown'),
    file('a.png', 'fake-image', 'image/png'),
  ]
  const paths = options.paths ?? files.map((entry) => entry.name)

  const form = {
    get: (key: string) => values.get(key) ?? null,
    getAll: (key: string) => {
      if (key === 'files') return files
      if (key === 'paths') return paths
      return []
    },
    has: (key: string) => values.has(key),
  }

  return {
    user: options.authenticated === false ? null : { id: 1 },
    payload,
    formData: options.formDataError
      ? async () => {
          throw new Error('bad multipart')
        }
      : async () => form,
  } as unknown as PayloadRequest
}

async function run(req: PayloadRequest) {
  if (!importMarkdownEndpoint.handler) throw new Error('missing import handler')
  return importMarkdownEndpoint.handler(req)
}

const emptyPayload = () => ({
  find: vi.fn(async () => ({ docs: [] })),
  create: vi.fn(async ({ collection, data }: { collection: string; data: Record<string, unknown> }) =>
    collection === 'media'
      ? { id: 19, filename: 'a.png' }
      : { id: 7, ...data },
  ),
  update: vi.fn(async ({ id }: { id: number | string }) => ({ id })),
  delete: vi.fn(async () => ({})),
})

beforeEach(() => vi.clearAllMocks())

describe('Markdown 导入端点：请求边界', () => {
  it('未登录、坏 multipart、空文件和无 Markdown 给明确状态码', async () => {
    expect((await run(request({}, { authenticated: false }))).status).toBe(401)
    expect((await run(request({}, { formDataError: true }))).status).toBe(400)
    expect((await run(request({}, { files: [], paths: [] }))).status).toBe(400)
    expect(
      (await run(request({}, { files: [file('a.png', 'x')], paths: ['a.png'] }))).status,
    ).toBe(400)
  })

  it('单文件超限时在读取内容前拒绝', async () => {
    const oversized = file('huge.md', '# huge', 'text/markdown', 16 * 1024 * 1024 + 1)
    const response = await run(request({}, { files: [oversized] }))
    expect(response.status).toBe(413)
    expect(oversized.arrayBuffer).not.toHaveBeenCalled()
  })

  it('总大小超限时拒绝请求', async () => {
    const files = Array.from({ length: 5 }, (_, index) =>
      file(`${index}.md`, '# x', 'text/markdown', 15 * 1024 * 1024),
    )
    const response = await run(request({}, { files }))
    expect(response.status).toBe(413)
  })

  it('缺省参数强制为中文草稿，非法参数也不会意外发布', async () => {
    const payload = emptyPayload()
    const response = await run(
      request(payload, {
        files: [file('page.md', '# Page\n\nBody')],
        values: { locale: 'fr', status: 'unexpected', onExisting: 'bad' },
      }),
    )
    const body = await response.json()

    expect(body.summary).toMatchObject({ locale: 'zh', status: 'draft', onExisting: 'update' })
    const createDoc = payload.create.mock.calls.find(([arg]) => arg.collection === 'docs')?.[0]
    expect(createDoc).toMatchObject({ locale: 'zh', data: { _status: 'draft' } })
  })

  it('只有显式传 published 才直接发布', async () => {
    const payload = emptyPayload()
    const response = await run(
      request(payload, {
        files: [file('page.md', '# Page\n\nBody')],
        values: { locale: 'en', status: 'published' },
      }),
    )
    const body = await response.json()
    expect(body.summary).toMatchObject({ locale: 'en', status: 'published' })
    const createDoc = payload.create.mock.calls.find(([arg]) => arg.collection === 'docs')?.[0]
    expect(createDoc).toMatchObject({ locale: 'en', data: { _status: 'published' } })
  })
})

describe('Markdown 导入端点：数据一致性', () => {
  it('预演不执行 create/update/delete，但报告预期动作', async () => {
    const payload = emptyPayload()
    const response = await run(
      request(payload, { values: { dryRun: '1', status: 'draft' } }),
    )
    const body = await response.json()

    expect(body.summary.dryRun).toBe(true)
    expect(body.summary.docs.created).toBe(1)
    expect(payload.create).not.toHaveBeenCalled()
    expect(payload.update).not.toHaveBeenCalled()
    expect(payload.delete).not.toHaveBeenCalled()
  })

  it('选择跳过已有文档时，不写入任何图片', async () => {
    const payload = {
      ...emptyPayload(),
      find: vi.fn(async ({ collection }: { collection: string }) =>
        collection === 'docs' ? { docs: [{ id: 7 }] } : { docs: [] },
      ),
    }

    const response = await run(
      request(payload, { values: { onExisting: 'skip', status: 'draft' } }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.summary.docs.skipped).toBe(1)
    expect(payload.create).not.toHaveBeenCalled()
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('覆盖已有文档时走 update 而不是 create doc', async () => {
    const payload = {
      ...emptyPayload(),
      find: vi.fn(async ({ collection }: { collection: string }) =>
        collection === 'docs' ? { docs: [{ id: 7 }] } : { docs: [] },
      ),
    }
    const response = await run(
      request(payload, {
        files: [file('page.md', '# Updated\n\nBody')],
        values: { onExisting: 'update', status: 'draft' },
      }),
    )
    const body = await response.json()

    expect(body.summary.docs.updated).toBe(1)
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7, locale: 'zh', data: expect.objectContaining({ title: 'Updated' }) }),
    )
    expect(payload.create).not.toHaveBeenCalled()
  })

  it('缺图不阻断文档导入，并在报告中明确标出', async () => {
    const payload = emptyPayload()
    const response = await run(
      request(payload, { files: [file('page.md', '# Page\n\n![missing](none.png)')] }),
    )
    const body = await response.json()

    expect(body.summary.docs.created).toBe(1)
    expect(body.summary.images.missing).toBe(1)
    expect(body.results[0].images[0]).toMatchObject({ status: 'missing', resolvedPath: 'none.png' })
  })

  it('内容相同的已有媒体直接复用，不重复上传', async () => {
    const payload = {
      ...emptyPayload(),
      find: vi.fn(async ({ collection }: { collection: string }) =>
        collection === 'media' ? { docs: [{ filename: 'existing.png' }] } : { docs: [] },
      ),
    }
    const response = await run(request(payload))
    const body = await response.json()

    expect(body.summary.images).toMatchObject({ uploaded: 0, reused: 1 })
    expect(
      payload.create.mock.calls.filter(([arg]) => arg.collection === 'media'),
    ).toHaveLength(0)
    const createDoc = payload.create.mock.calls.find(([arg]) => arg.collection === 'docs')?.[0]
    expect(createDoc).toBeDefined()
    expect(createDoc?.data.content).toContain('/api/media/file/existing.png')
  })

  it('文档写入失败时，删除本篇刚创建的媒体', async () => {
    const remove = vi.fn(async () => ({}))
    const payload = {
      find: vi.fn(async () => ({ docs: [] })),
      create: vi.fn(async ({ collection }: { collection: string }) => {
        if (collection === 'media') return { id: 19, filename: 'a.png' }
        throw new Error('document write failed')
      }),
      update: vi.fn(),
      delete: remove,
    }

    const response = await run(request(payload))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.summary.docs.failed).toBe(1)
    expect(body.results[0].error).toBe('document write failed')
    expect(remove).toHaveBeenCalledWith({ collection: 'media', id: 19 })
  })

  it('同批文件得到相同 slug 时全部失败，不静默互相覆盖', async () => {
    const payload = emptyPayload()
    const response = await run(
      request(payload, {
        files: [file('guide.md', '# Guide file'), file('index.md', '# Guide index')],
        paths: ['guide.md', 'guide/index.md'],
      }),
    )
    const body = await response.json()

    expect(body.summary.docs).toMatchObject({ total: 2, created: 0, updated: 0, failed: 2 })
    expect(body.results.every((result: { error?: string }) => result.error === 'crDocs:errDuplicateSlug')).toBe(true)
    expect(payload.create).not.toHaveBeenCalled()
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('单篇失败不拖垮整批，后续文档继续导入', async () => {
    const payload = emptyPayload()
    payload.create.mockImplementation(async ({ collection, data }) => {
      if (collection === 'docs' && data.slug === 'bad') throw new Error('bad doc')
      return { id: data.slug === 'good' ? 2 : 1, ...data }
    })

    const response = await run(
      request(payload, {
        files: [file('bad.md', '# Bad\n\nBody'), file('good.md', '# Good\n\nBody')],
      }),
    )
    const body = await response.json()

    expect(body.summary.docs).toMatchObject({ total: 2, created: 1, failed: 1 })
    expect(body.results.map((result: { action: string }) => result.action)).toEqual([
      'failed',
      'created',
    ])
  })
})
