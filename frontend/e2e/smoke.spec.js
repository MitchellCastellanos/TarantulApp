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

  test('Legacy /comunidad redirects away from the paused community hub', async ({ page }) => {
    // Community is paused: /comunidad and /community no longer render a hub —
    // they redirect to the dashboard (and on to /login when logged out).
    await page.goto('/comunidad')
    await expect(page).not.toHaveURL(/comunidad|community/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})

test.describe('Phase F — community paused', () => {
  test('community route redirects away (hub paused)', async ({ page }) => {
    await page.goto('/community')
    await expect(page).not.toHaveURL(/\/community/)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
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
