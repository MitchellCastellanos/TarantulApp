/**
 * Prerenders public marketing/legal routes to static HTML after `vite build`, so
 * crawlers and social-share bots that don't execute JS (Facebook, Twitter/X,
 * LinkedIn, Slack, WhatsApp — and the first wave of Googlebot indexing) get the
 * real per-page <title>/description/OG tags and content instead of the generic
 * shell in index.html.
 *
 * Scope: only the static/near-static PUBLIC_ROUTES from vite-plugin-site-seo.js.
 * Dynamic detail pages (species, listings) are already covered by sitemap.xml
 * and their own usePageSeo() calls; prerendering those is a future step.
 *
 * Safety: this is invoked as a distinct step (see package.json "prerender" and
 * vercel.json's buildCommand) — never chained into the plain `build` script,
 * which is also used by the Android AAB workflow where Chromium isn't
 * installed. Every failure path below is non-fatal: if Chromium can't be
 * launched, we log a warning and leave dist/ exactly as `vite build` produced
 * it, so the rest of the deploy is unaffected either way.
 *
 * Run: npm run prerender   (from frontend/, after `npm run build`)
 */
import { chromium } from '@playwright/test'
import { loadEnv } from 'vite'
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const distDir = join(root, 'dist')
const indexHtmlPath = join(distDir, 'index.html')
const homeHtmlPath = join(distDir, 'home.html')

const PORT = 4321
const baseURL = `http://127.0.0.1:${PORT}`
const NAV_TIMEOUT_MS = 15_000
const SANDBOX_CHROMIUM = '/opt/pw-browsers/chromium'

/**
 * `vite preview` only exists locally at baseURL — but usePageSeo() bakes
 * `window.location.origin` into canonical/og:url/og:image. Resolve the same
 * VITE_PUBLIC_SITE_URL vite.config.js uses for the sitemap, and rewrite it in
 * post so prerendered pages don't ship canonical tags pointing at 127.0.0.1.
 */
function resolvePublicSiteUrl() {
  const env = loadEnv('production', root, '')
  const raw = (env.VITE_PUBLIC_SITE_URL || '').trim().replace(/\/+$/, '')
  if (raw && /^https?:\/\//i.test(raw)) return raw
  return 'https://tarantulapp.com'
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok || res.status === 404) return true
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  return false
}

async function launchChromium() {
  const opts = existsSync(SANDBOX_CHROMIUM) ? { executablePath: SANDBOX_CHROMIUM } : {}
  try {
    return await chromium.launch(opts)
  } catch (err) {
    console.warn('[prerender] Chromium not available, attempting `playwright install chromium`…')
    const install = spawnSync('npx', ['playwright', 'install', 'chromium'], {
      cwd: root,
      stdio: 'inherit',
    })
    if (install.status !== 0) throw err
    return chromium.launch(opts)
  }
}

async function main() {
  if (!existsSync(distDir) || !existsSync(indexHtmlPath)) {
    console.warn('[prerender] dist/index.html not found — run `vite build` first. Skipping.')
    return
  }

  // Guarantee home.html always exists (plain SPA shell) before attempting anything
  // riskier, so vercel.json's "/" -> "/home.html" rewrite never 404s even if the
  // steps below fail partway through.
  copyFileSync(indexHtmlPath, homeHtmlPath)

  let routes
  try {
    ;({ PUBLIC_ROUTES: routes } = await import('../vite-plugin-site-seo.js'))
  } catch (err) {
    console.warn('[prerender] Could not load PUBLIC_ROUTES, skipping.', err?.message || err)
    return
  }

  let browser
  try {
    browser = await launchChromium()
  } catch (err) {
    console.warn(
      '[prerender] Chromium unavailable — shipping the plain SPA build without prerendered pages.',
      err?.message || err
    )
    return
  }

  const server = spawn(
    'npx',
    ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
    { cwd: root, stdio: 'pipe' }
  )

  try {
    const up = await waitForServer(baseURL, 30_000)
    if (!up) {
      console.warn('[prerender] `vite preview` did not come up in time — skipping.')
      return
    }

    const page = await browser.newPage()
    const publicSiteUrl = resolvePublicSiteUrl()
    let ok = 0

    for (const route of routes) {
      const url = `${baseURL}${route}`
      try {
        // 'load' rather than 'networkidle': pages with polling/analytics/websocket
        // traffic (Sentry, react-query background refetch) would never go idle.
        await page.goto(url, { waitUntil: 'load', timeout: NAV_TIMEOUT_MS })
        await page.waitForTimeout(800)
        const html = await page.content().then((h) => h.replaceAll(baseURL, publicSiteUrl))

        if (route === '/') {
          writeFileSync(homeHtmlPath, html, 'utf8')
        } else {
          const outDir = join(distDir, route.replace(/^\//, ''))
          mkdirSync(outDir, { recursive: true })
          writeFileSync(join(outDir, 'index.html'), html, 'utf8')
        }
        ok += 1
      } catch (err) {
        console.warn(`[prerender] Failed on ${route}, leaving SPA fallback for it.`, err?.message || err)
      }
    }

    await page.close()
    console.log(`[prerender] Prerendered ${ok}/${routes.length} public routes.`)
  } finally {
    server.kill()
    await browser.close().catch(() => {})
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.warn('[prerender] Unexpected failure — shipping the plain SPA build.', err)
    process.exit(0)
  })
