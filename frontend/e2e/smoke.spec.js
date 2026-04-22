import { test, expect } from '@playwright/test'

test.describe('Sprint 1 public routes', () => {
  test('login loads and title mentions TarantulApp', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/TarantulApp/i)
  })

  test('Discover page shows main heading', async ({ page }) => {
    await page.goto('/descubrir')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('Marketplace loads', async ({ page }) => {
    await page.goto('/marketplace')
    await expect(page).toHaveTitle(/TarantulApp|marketplace|keeper|Marketplace|keepers/i)
  })

  test('About page shows h1', async ({ page }) => {
    await page.goto('/about')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('Community route redirects to login when logged out', async ({ page }) => {
    await page.goto('/comunidad')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Static SEO assets', () => {
  test('robots.txt responds', async ({ request }) => {
    const res = await request.get('/robots.txt')
    expect(res.ok()).toBeTruthy()
    const text = await res.text()
    expect(text).toMatch(/User-agent/i)
  })

  test('sitemap.xml includes marketplace and about', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    expect(res.ok()).toBeTruthy()
    const text = await res.text()
    expect(text).toContain('urlset')
    expect(text).toContain('/marketplace')
    expect(text).toContain('/about')
  })
})
