import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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

export default defineConfig({
  plugins: [react()],
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
})
