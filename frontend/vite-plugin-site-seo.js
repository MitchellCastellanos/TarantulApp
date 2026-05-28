import fs from 'node:fs'
import path from 'node:path'

/** Rutas públicas indexables (canónicas, sin área autenticada ni redirecciones 301). */
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/discover',
  '/discover/catalog',
  '/discover/compare',
  '/tools/qr',
  '/marketplace',
  '/partners',
  '/sex-id',
  '/about',
  '/pro',
  '/contact',
  '/privacy',
  '/terms',
  '/marketplace-policy',
  '/legal/verified-vendors',
  '/account-deletion',
]

/** Áreas autenticadas, transaccionales o solo-redirección que no deben rastrearse. */
const DISALLOWED_PATHS = [
  '/account',
  '/admin',
  '/reminders',
  '/insights',
  '/notifications',
  '/wishlist',
  '/onboarding',
  '/tarantulas/',
  '/marketplace/messages',
  '/marketplace/sell',
  '/forgot-password',
  '/reset-password',
  '/vendor-invite',
  '/launch',
  '/launch_registration',
]

function normalizeBase(url) {
  if (!url || typeof url !== 'string') return null
  const t = url.trim().replace(/\/+$/, '')
  if (!t) return null
  if (!/^https?:\/\//i.test(t)) return null
  return t
}

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function locForRoute(base, route) {
  return route === '/' ? `${base}/` : `${base}${route}`
}

function speciesDetailRoute(id) {
  return `/discover/species/${id}`
}

async function fetchSpeciesDetailRoutes(apiBase) {
  const backend =
    (process.env.SITEMAP_SPECIES_API_URL || 'http://127.0.0.1:8080').replace(/\/+$/, '')
  const routes = []
  let page = 0
  const pageSize = 500
  try {
    for (;;) {
      const url = `${backend}/api/public/species/sitemap-entries?page=${page}&pageSize=${pageSize}`
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) break
      const rows = await res.json()
      if (!Array.isArray(rows) || rows.length === 0) break
      for (const row of rows) {
        if (row?.id != null) routes.push(speciesDetailRoute(row.id))
      }
      if (rows.length < pageSize) break
      page += 1
    }
  } catch {
  }
  if (routes.length === 0 && apiBase) {
    console.warn(
      '[tarantulapp-site-seo] No species detail URLs fetched — is the API running at build time? Set SITEMAP_SPECIES_API_URL if needed.'
    )
  } else if (routes.length > 0) {
    console.log(`[tarantulapp-site-seo] ${routes.length} species detail URLs for sitemap`)
  }
  return routes
}

function buildSitemapXml(base, extraRoutes = []) {
  const today = new Date().toISOString().slice(0, 10)
  const allRoutes = [...PUBLIC_ROUTES, ...extraRoutes]
  const body = allRoutes.map((route) => {
    const loc = escapeXml(locForRoute(base, route))
    const isSpecies = route.startsWith('/discover/species/')
    const isPrimary =
      route === '/tools/qr' ||
      route === '/discover' ||
      route === '/discover/catalog' ||
      route === '/marketplace' ||
      route === '/about'
    const priority =
      route === '/'
        ? '1.0'
        : isSpecies
          ? '0.75'
          : isPrimary
            ? '0.9'
            : '0.65'
    const changefreq =
      route === '/' ||
      route === '/discover' ||
      route === '/discover/catalog' ||
      route === '/tools/qr' ||
      route === '/marketplace' ||
      isSpecies
        ? 'weekly'
        : 'monthly'
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`
}

function buildRobotsTxt(base) {
  let out = 'User-agent: *\nAllow: /\n'
  for (const p of DISALLOWED_PATHS) out += `Disallow: ${p}\n`
  if (base) out += `\nSitemap: ${base}/sitemap.xml\n`
  return out
}

function attachSeoDevMiddleware(server, publicSiteUrl, kind) {
  server.middlewares.use((req, res, next) => {
    const pathname = (req.url || '').split('?')[0]
    if (pathname !== '/sitemap.xml' && pathname !== '/robots.txt') {
      next()
      return
    }
    const fromEnv = normalizeBase(publicSiteUrl)
    const port =
      kind === 'preview' ? server.config.preview?.port ?? 5173 : server.config.server?.port ?? 5173
    const fallbackBase = `http://127.0.0.1:${port}`
    const devBase = fromEnv || fallbackBase
    if (pathname === '/sitemap.xml') {
      res.setHeader('Content-Type', 'application/xml; charset=utf-8')
      fetchSpeciesDetailRoutes(devBase).then((speciesRoutes) => {
        res.end(buildSitemapXml(devBase, speciesRoutes))
      }).catch(() => {
        res.end(buildSitemapXml(devBase, []))
      })
      return
    }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end(buildRobotsTxt(fromEnv || devBase))
  })
}

/**
 * Genera `sitemap.xml` y `robots.txt` en `outDir` al hacer build, y los sirve en `vite dev` / `preview`.
 * @param {{ publicSiteUrl: string }} opts — `VITE_PUBLIC_SITE_URL` (origen canónico, sin barra final).
 */
export function siteSeoPlugin({ publicSiteUrl = '' } = {}) {
  let outDir = path.resolve(process.cwd(), 'dist')

  return {
    name: 'tarantulapp-site-seo',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    async closeBundle() {
      const base = normalizeBase(publicSiteUrl)
      const robotsPath = path.join(outDir, 'robots.txt')
      if (!base) {
        console.warn(
          '[tarantulapp-site-seo] VITE_PUBLIC_SITE_URL no está definida o no es http(s)://… — no se escribe sitemap.xml (solo robots mínimo).'
        )
        const stale = path.join(outDir, 'sitemap.xml')
        if (fs.existsSync(stale)) fs.unlinkSync(stale)
        fs.writeFileSync(robotsPath, buildRobotsTxt(null), 'utf8')
        return
      }
      const speciesRoutes = await fetchSpeciesDetailRoutes(base)
      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), buildSitemapXml(base, speciesRoutes), 'utf8')
      fs.writeFileSync(robotsPath, buildRobotsTxt(base), 'utf8')
      console.log(`[tarantulapp-site-seo] sitemap.xml + robots.txt → ${base}`)
    },
    configureServer(server) {
      attachSeoDevMiddleware(server, publicSiteUrl, 'server')
    },
    configurePreviewServer(server) {
      attachSeoDevMiddleware(server, publicSiteUrl, 'preview')
    },
  }
}
