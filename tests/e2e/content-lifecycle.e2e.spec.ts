import { expect, test } from '@playwright/test'
import { getPayload } from 'payload'
import config from '../../src/payload.config'

const QA_SLUG = 'qa-boundary/lifecycle'
const ZH_TITLE = 'QA 中文生命周期文档'
const EN_TITLE = 'QA English lifecycle document'

let payload: Awaited<ReturnType<typeof getPayload>>
let docID: number | string

async function setAllStatuses(status: 'draft' | 'published') {
  const docs = await payload.find({ collection: 'docs', draft: true, limit: 1000, pagination: false })
  for (const doc of docs.docs) {
    await payload.update({
      collection: 'docs',
      id: doc.id,
      data: { _status: status },
    })
  }
}

test.describe.configure({ mode: 'serial' })

test.describe('文档发布与多语言生命周期', () => {
  test.skip(
    process.env.E2E_ALLOW_MUTATION !== '1',
    '破坏性生命周期测试仅允许在隔离 QA 数据库运行（E2E_ALLOW_MUTATION=1）',
  )
  test.beforeAll(async () => {
    payload = await getPayload({ config: await config })
    await payload.delete({ collection: 'docs', where: { slug: { equals: QA_SLUG } } })
    const created = await payload.create({
      collection: 'docs',
      locale: 'zh',
      data: {
        slug: QA_SLUG,
        title: ZH_TITLE,
        content: '中文正文\n\n## 中文章节',
        _status: 'draft',
      },
    })
    docID = created.id
  })

  test.afterAll(async () => {
    // 即使“全部取消发布”用例失败，也恢复种子文档，避免污染后续测试。
    await setAllStatuses('published')
    await payload.delete({ collection: 'docs', where: { slug: { equals: QA_SLUG } } })
  })

  test('草稿不能从具体地址或搜索索引泄露到前台', async ({ page, request }) => {
    await page.goto(`/docs/zh/${QA_SLUG}`)
    await expect(page).not.toHaveURL(new RegExp(`${QA_SLUG}$`))
    await expect(page.getByText(ZH_TITLE)).toHaveCount(0)

    const index = await request.get('/search-index?locale=zh')
    expect(index.ok()).toBe(true)
    const docs = (await index.json()) as { slug: string }[]
    expect(docs.some((doc) => doc.slug === QA_SLUG)).toBe(false)
  })

  test('只发布中文时中文可见，英文按钮禁用且英文地址不回退中文', async ({ page }) => {
    await payload.update({
      collection: 'docs',
      id: docID,
      locale: 'zh',
      data: { _status: 'published' },
    })

    await page.goto(`/docs/zh/${QA_SLUG}`)
    await expect(page.locator('.vp-doc-title')).toHaveText(ZH_TITLE)
    const disabledEnglish = page.locator('.vp-locale-switch .disabled', { hasText: 'EN' })
    await expect(disabledEnglish).toBeVisible()
    await expect(disabledEnglish).toHaveAttribute('aria-disabled', 'true')
    await expect(disabledEnglish).toHaveAttribute('title', '该文档暂无英文版本')

    await page.goto(`/docs/en/${QA_SLUG}`)
    await expect(page).not.toHaveURL(new RegExp(`/docs/en/${QA_SLUG}$`))
    await expect(page.getByText(ZH_TITLE)).toHaveCount(0)
  })

  test('补齐英文后语言按钮自动启用并停留在同一 slug', async ({ page }) => {
    await payload.update({
      collection: 'docs',
      id: docID,
      locale: 'en',
      data: {
        title: EN_TITLE,
        content: 'English content\n\n## English section',
      },
    })

    await page.goto(`/docs/zh/${QA_SLUG}`)
    const englishLink = page.locator('.vp-locale-switch a', { hasText: 'EN' })
    await expect(englishLink).toBeVisible()
    await englishLink.click()
    await expect(page).toHaveURL(new RegExp(`/docs/en/${QA_SLUG}$`))
    await expect(page.locator('.vp-doc-title')).toHaveText(EN_TITLE)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })

  test('全部取消发布后首页显示空状态，旧文档地址不返回 404', async ({ page }) => {
    await setAllStatuses('draft')

    const home = await page.goto('/docs/zh')
    expect(home?.status()).toBe(200)
    await expect(page).toHaveURL(/\/docs\/zh$/)
    await expect(page.locator('.vp-doc-title')).toHaveText('还没有内容')

    const oldAddress = await page.goto(`/docs/zh/${QA_SLUG}`)
    expect(oldAddress?.status()).toBe(200)
    await expect(page).toHaveURL(/\/docs\/zh$/)
    await expect(page.locator('.vp-doc-title')).toHaveText('还没有内容')

    const englishHome = await page.goto('/docs/en')
    expect(englishHome?.status()).toBe(200)
    await expect(page.locator('.vp-doc-title')).toHaveText('No content yet')
  })
})
