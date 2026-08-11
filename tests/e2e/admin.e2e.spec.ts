import { test, expect, Page } from '@playwright/test'
import { login } from '../helpers/login'
import { seedTestUser, cleanupTestUser, testUser } from '../helpers/seedUser'

test.describe('Admin Panel', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    await seedTestUser()

    const context = await browser.newContext()
    page = await context.newPage()

    await login({ page, user: testUser })
  })

  test.afterAll(async () => {
    await cleanupTestUser()
  })

  test('can navigate to dashboard', async () => {
    await page.goto(`${process.env.E2E_BASE_URL || 'http://localhost:3000'}/admin`)
    await expect(page).toHaveURL(new RegExp('/admin$'))
    const dashboardArtifact = page.locator('span[title="Dashboard"]').first()
    await expect(dashboardArtifact).toBeVisible()
  })

  test('can navigate to list view', async () => {
    await page.goto(`${process.env.E2E_BASE_URL || 'http://localhost:3000'}/admin/collections/users`)
    await expect(page).toHaveURL(new RegExp('/admin/collections/users$'))
    const listViewArtifact = page.locator('h1', { hasText: 'Users' }).first()
    await expect(listViewArtifact).toBeVisible()
  })

  test('can navigate to edit view', async () => {
    await page.goto(`${process.env.E2E_BASE_URL || 'http://localhost:3000'}/admin/collections/users/create`)
    await expect(page).toHaveURL(/\/admin\/collections\/users\/[a-zA-Z0-9-_]+/)
    const editViewArtifact = page.locator('input[name="email"]')
    await expect(editViewArtifact).toBeVisible()
  })

  test('locale switch changes both content locale and admin UI language', async () => {
    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000'
    await page.goto(`${baseURL}/admin?locale=zh`)

    await expect(page.locator('html')).toHaveAttribute('lang', 'zh')
    await expect(page.getByRole('button', { name: '语言环境' })).toContainText('中文')
    await expect(page.getByRole('heading', { name: '快捷入口' })).toBeVisible()

    await page.getByRole('button', { name: '语言环境' }).click()
    await page.getByText('English (en)', { exact: true }).click()

    await expect(page).toHaveURL(/\/admin\?locale=en$/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('button', { name: 'Locale' })).toContainText('English')
    await expect(page.getByRole('heading', { name: 'Quick actions' })).toBeVisible()

    // The UI language is persisted even when the next URL has no content-locale query.
    await page.goto(`${baseURL}/admin/collections/docs`)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { name: 'Documents', exact: true })).toBeVisible()
  })
})
