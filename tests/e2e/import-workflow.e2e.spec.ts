import { expect, test } from '@playwright/test'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getPayload } from 'payload'
import config from '../../src/payload.config'
import { login } from '../helpers/login'

const SLUG = 'qa-import/browser-default-draft'
const TITLE = '浏览器导入默认草稿测试'
const FOLDER_SLUG = 'qa-import/folder-default-draft'
const FOLDER_TITLE = '文件夹导入默认草稿测试'
const PUBLISHED_SLUG = 'qa-import/explicit-published'
const PUBLISHED_TITLE = '显式发布导入测试'

let payload: Awaited<ReturnType<typeof getPayload>>
let fixtureRoot: string

test.describe.configure({ mode: 'serial' })

test.describe('后台 Markdown 导入工作流', () => {
  test.skip(
    process.env.E2E_ALLOW_MUTATION !== '1',
    '导入测试仅允许在隔离 QA 数据库运行（E2E_ALLOW_MUTATION=1）',
  )

  test.beforeAll(async () => {
    payload = await getPayload({ config: await config })
    await payload.delete({
      collection: 'docs',
      where: { slug: { in: [SLUG, FOLDER_SLUG, PUBLISHED_SLUG] } },
    })

    fixtureRoot = await mkdtemp(join(tmpdir(), 'cr-docs-folder-import-'))
    const nested = join(fixtureRoot, 'guide')
    await mkdir(nested)
    await writeFile(
      join(nested, 'folder-default-draft.md'),
      `---\nslug: ${FOLDER_SLUG}\ntitle: ${FOLDER_TITLE}\n---\n\n文件夹导入正文`,
    )
  })

  test.afterAll(async () => {
    await payload.delete({
      collection: 'docs',
      where: { slug: { in: [SLUG, FOLDER_SLUG, PUBLISHED_SLUG] } },
    })
    if (fixtureRoot) await rm(fixtureRoot, { force: true, recursive: true })
  })

  test('未登录访问导入页会被后台认证拦截，不能看到上传表单', async ({ page }) => {
    await page.goto('/admin/import-md')
    await expect(page).toHaveURL(/\/admin\/login/)
    await expect(page.getByText('执行导入')).toHaveCount(0)
  })

  test('登录后导入控件默认选择草稿', async ({ page }) => {
    await login({
      page,
      user: {
        email: process.env.QA_ADMIN_EMAIL || 'qa@example.com',
        password: process.env.QA_ADMIN_PASSWORD || 'qa-password',
      },
    })
    await page.goto('/admin/import-md?locale=zh')

    await expect(page.locator('#field-status .value-container')).toHaveAttribute(
      'title',
      /^(草稿|Draft)$/,
    )
    await expect(page.locator('#field-locale .value-container')).toHaveAttribute(
      'title',
      /^(中文|Chinese)$/,
    )
    await expect(page.locator('#field-onExisting .value-container')).toHaveAttribute(
      'title',
      /^(覆盖更新|Overwrite)$/,
    )

    // 导入语言必须跟随后台当前内容 locale，不能永远硬编码成中文。
    await page.goto('/admin/import-md?locale=en')
    await expect(page.locator('#field-locale .value-container')).toHaveAttribute('title', 'English')
    await expect(page.locator('#field-status .value-container')).toHaveAttribute('title', 'Draft')
  })

  test('选择整个文件夹后仍提交 draft，数据库不会直接发布', async ({ page }) => {
    await login({
      page,
      user: {
        email: process.env.QA_ADMIN_EMAIL || 'qa@example.com',
        password: process.env.QA_ADMIN_PASSWORD || 'qa-password',
      },
    })
    await page.goto('/admin/import-md?locale=zh')

    await page.locator('input[type="file"]').nth(1).setInputFiles(fixtureRoot)
    await expect(page.locator('#field-status .value-container')).toHaveAttribute(
      'title',
      /^(草稿|Draft)$/,
    )
    await page.getByRole('button', { name: /执行导入|Import$/ }).click()

    await expect(page.getByText(/导入完成|Import complete/)).toBeVisible()

    const result = await payload.find({
      collection: 'docs',
      where: { slug: { equals: FOLDER_SLUG } },
      locale: 'zh',
      draft: true,
      limit: 1,
    })
    expect(result.totalDocs).toBe(1)
    expect(result.docs[0]._status).toBe('draft')
    expect(result.docs[0].title).toBe(FOLDER_TITLE)
  })

  test('只有明确选择已发布时才直接发布', async ({ page }) => {
    await login({
      page,
      user: {
        email: process.env.QA_ADMIN_EMAIL || 'qa@example.com',
        password: process.env.QA_ADMIN_PASSWORD || 'qa-password',
      },
    })
    await page.goto('/admin/import-md?locale=zh')

    await page.locator('#field-status .value-container').click()
    await page.getByText(/^(已发布|Published)$/).click()
    await expect(page.locator('#field-status .value-container')).toHaveAttribute(
      'title',
      /^(已发布|Published)$/,
    )

    const markdown = `---\nslug: ${PUBLISHED_SLUG}\ntitle: ${PUBLISHED_TITLE}\n---\n\n显式发布正文`
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'explicit-published.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from(markdown),
    })
    await page.getByRole('button', { name: /执行导入|Import$/ }).click()
    await expect(page.getByText(/导入完成|Import complete/)).toBeVisible()

    const result = await payload.find({
      collection: 'docs',
      where: { slug: { equals: PUBLISHED_SLUG } },
      locale: 'zh',
      draft: true,
      limit: 1,
    })
    expect(result.docs[0]?._status).toBe('published')

    await page.goto(`/docs/zh/${PUBLISHED_SLUG}`)
    await expect(page.getByRole('heading', { name: PUBLISHED_TITLE })).toBeVisible()
  })

  test('从浏览器导入后数据库状态是 draft，前台不可见', async ({ page }) => {
    await login({
      page,
      user: {
        email: process.env.QA_ADMIN_EMAIL || 'qa@example.com',
        password: process.env.QA_ADMIN_PASSWORD || 'qa-password',
      },
    })
    await page.goto('/admin/import-md?locale=zh')

    const markdown = `---\nslug: ${SLUG}\ntitle: ${TITLE}\n---\n\n正文\n\n## 章节`
    await page.locator('input[type="file"]').first().setInputFiles({
      name: 'browser-default-draft.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from(markdown),
    })
    await page.getByRole('button', { name: /执行导入|Import$/ }).click()
    await expect(page.getByText(/导入完成|Import complete/)).toBeVisible()

    const result = await payload.find({
      collection: 'docs',
      where: { slug: { equals: SLUG } },
      locale: 'zh',
      draft: true,
      limit: 1,
    })
    expect(result.totalDocs).toBe(1)
    expect(result.docs[0]._status).toBe('draft')
    expect(result.docs[0].title).toBe(TITLE)

    await page.goto(`/docs/zh/${SLUG}`)
    await expect(page).not.toHaveURL(new RegExp(`${SLUG}$`))
    await expect(page.getByText(TITLE)).toHaveCount(0)
  })
})
