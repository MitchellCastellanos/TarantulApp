import { mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { test } from '@playwright/test'

const __dirname = dirname(fileURLToPath(import.meta.url))
/** PNG listos para MKT / Highlights (repo root → Social/Highlights/screenshots/playwright). */
const OUT_DIR = join(__dirname, '..', '..', 'Social', 'Highlights', 'screenshots', 'playwright')

function out(name) {
  mkdirSync(OUT_DIR, { recursive: true })
  return join(OUT_DIR, name)
}

test.describe('Marketing screenshots (mobile viewport)', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  })

  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      try {
        localStorage.setItem('tarantulapp_cs_bypass_v1', '1')
        localStorage.setItem('tarantulapp-theme', 'dark')
      } catch {
        /* ignore */
      }
    })
  })

  test('discover', async ({ page }) => {
    await page.goto('/discover', { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { level: 1 }).first().waitFor({ state: 'visible', timeout: 20_000 })
    await page.screenshot({ path: out('discover.png'), fullPage: false })
  })

  test('marketplace', async ({ page }) => {
    await page.goto('/marketplace', { waitUntil: 'domcontentloaded' })
    await page.locator('.ta-premium-pane').first().waitFor({ state: 'visible', timeout: 20_000 })
    await page.screenshot({ path: out('marketplace.png'), fullPage: false })
  })

  test('community', async ({ page }) => {
    await page.goto('/community', { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { level: 1 }).first().waitFor({ state: 'visible', timeout: 20_000 })
    await page.screenshot({ path: out('community.png'), fullPage: false })
  })

  test('login', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { level: 1 }).first().waitFor({ state: 'visible', timeout: 15_000 })
    await page.screenshot({ path: out('login.png'), fullPage: false })
  })

  test('about', async ({ page }) => {
    await page.goto('/about', { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { level: 1 }).first().waitFor({ state: 'visible', timeout: 15_000 })
    await page.screenshot({ path: out('about.png'), fullPage: false })
  })
})
