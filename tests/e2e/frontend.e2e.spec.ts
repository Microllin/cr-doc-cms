import { expect, test } from '@playwright/test'

test.describe('CR Docs frontend', () => {
  test('首页进入中文文档站并渲染当前站点', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveURL(/\/docs\/zh(?:\/|$)/)
    await expect(page.locator('.vp-nav')).toBeVisible()
    await expect(page.locator('.vp-sidebar')).toBeVisible()
    await expect(page.locator('.vp-doc-title')).toBeVisible()
  })

  test('语言切换进入英文站并同步页面语言', async ({ page }) => {
    await page.goto('/docs/zh')
    await page.locator('.vp-locale-switch a', { hasText: 'EN' }).click()

    await expect(page).toHaveURL(/\/docs\/en(?:\/|$)/)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('.vp-search-btn')).toHaveAttribute('aria-label', 'Search')
  })

  test('搜索框可通过按钮和快捷键打开', async ({ page }) => {
    await page.goto('/docs/zh')
    const searchButton = page.locator('.vp-search-btn')
    await expect(searchButton).toBeVisible()

    // 先用点击确认客户端 hydration 已完成，再验证快捷键监听。
    await searchButton.click()
    await expect(page.locator('[cmdk-dialog]')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('[cmdk-dialog]')).toBeHidden()

    await page.keyboard.press('Control+K')
    await expect(page.locator('[cmdk-dialog]')).toBeVisible()
  })
})
