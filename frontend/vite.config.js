import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { siteSeoPlugin } from './vite-plugin-site-seo.js'

/** Reenvío explícito de Authorization: http-proxy a veces no lo pasa bien en POST/PUT hacia el upstream. */
function forwardAuthHeader(proxy) {
  proxy.on('proxyReq', (proxyReq, req) => {
    const h = req.headers
    const auth = h?.authorization ?? h?.Authorization
    const value = Array.isArray(auth) ? auth.join(', ') : auth
    if (value) {
      proxyReq.setHeader('Authorization', value)
    }
  })
}

/** Mismo mapa para `vite dev` y `vite preview` (sin esto, POST /api/* en preview → 403). */
/** Origen canónico del sitio (sitemap, robots). Sobrescribe con `VITE_PUBLIC_SITE_URL` si hace falta. */
const DEFAULT_CANONICAL_SITE = 'https://tarantulapp.com'

function resolvePublicSiteUrl(envValue) {
  const raw = (envValue || '').trim().replace(/\/+$/, '')
  if (!raw) return DEFAULT_CANONICAL_SITE
  if (!/^https?:\/\//i.test(raw)) return DEFAULT_CANONICAL_SITE
  return raw
}

const backendDevProxy = {
  '/api': {
    target: 'http://localhost:8080',
    changeOrigin: true,
    configure: (proxy) => forwardAuthHeader(proxy),
  },
  '/uploads': {
    target: 'http://localhost:8080',
    changeOrigin: true,
    configure: (proxy) => forwardAuthHeader(proxy),
  },
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const publicSiteUrl = resolvePublicSiteUrl(env.VITE_PUBLIC_SITE_URL)

  return {
    plugins: [react(), siteSeoPlugin({ publicSiteUrl })],
    server: {
      port: 5173,
      strictPort: false,
      proxy: backendDevProxy,
    },
    preview: {
      port: 5173,
      strictPort: false,
      proxy: backendDevProxy,
    },
  }
})
