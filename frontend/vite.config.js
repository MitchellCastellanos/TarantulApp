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

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Redirige /api/* y /uploads/* al backend Spring Boot en dev
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        configure: proxy => forwardAuthHeader(proxy)
      },
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        configure: proxy => forwardAuthHeader(proxy)
      }
    }
  }
})
