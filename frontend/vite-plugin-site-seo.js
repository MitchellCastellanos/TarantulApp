import fs from 'node:fs'
import path from 'node:path'

/** Rutas públicas indexables (sin área autenticada). */
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/descubrir',
  '/descubrir/comparar',
  '/herramientas/qr',
  '/about',
  '/marketplace',
  '/pro',
  '/privacy',
  '/terms',
  '/contact',
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

function buildSitemapXml(base) {
  const today = new Date().toISOString().slice(0, 10)
  const body = PUBLIC_ROUTES.map((route) => {
    const loc = escapeXml(locForRoute(base, route))
    const priority =
      route === '/'
        ? '1.0'
        : route === '/herramientas/qr' || route === '/descubrir' || route === '/marketplace' || route === '/about'
          ? '0.9'
          : '0.65'
    const changefreq =
      route === '/' || route === '/descubrir' || route === '/herramientas/qr' || route === '/marketplace'
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
      res.end(buildSitemapXml(devBase))
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
    closeBundle() {
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
      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), buildSitemapXml(base), 'utf8')
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
