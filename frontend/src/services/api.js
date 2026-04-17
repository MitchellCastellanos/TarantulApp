import axios, { AxiosHeaders } from 'axios'
import { getTokenForApiRequest } from './authApiToken'
import { notifyUnauthorized } from './authSession'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || '') + '/api',
  headers: { 'Content-Type': 'application/json' }
})

// Adjunta el JWT en cada request automáticamente (AxiosHeaders evita que se pierda en merges de POST)
api.interceptors.request.use((config) => {
  const path = String(config.url || '').split('?')[0]
  // Login/register/forgot/reset deben ir SIN Bearer: un JWT viejo en localStorage rompe la petición en Spring.
  const publicAuth = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'].includes(path)

  const headers = AxiosHeaders.from(config.headers)
  if (publicAuth) {
    headers.delete('Authorization')
  } else {
    const token = getTokenForApiRequest()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }
  // FormData: el default application/json rompe multipart; el navegador/adaptador envía boundary correcto.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    headers.delete('Content-Type')
  }
  config.headers = headers
  return config
})

// 401: cerrar sesión y volver al login (excepto peticiones marcadas con skipAuthRedirect)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (error.config?.skipAuthRedirect) {
        return Promise.reject(error)
      }
      const base = error.config?.baseURL || ''
      const path = error.config?.url || ''
      const h = error.config?.headers
      let hadAuth = false
      if (h) {
        const v = typeof h.get === 'function'
          ? (h.get('Authorization') || h.get('authorization'))
          : (h.Authorization || h.authorization)
        hadAuth = !!(v && String(v).trim())
      }
      notifyUnauthorized({ method: error.config?.method, url: `${base}${path}`, hadAuthorizationHeader: hadAuth })
    }
    return Promise.reject(error)
  }
)

export default api

// Construye la URL completa de una foto almacenada en el backend.
// En dev: '/uploads/path' (el proxy de Vite lo redirige al backend local)
// En producción: 'https://railway-url/uploads/path'
export function imgUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path   // Cloudinary or any absolute URL
  return (import.meta.env.VITE_API_URL || '') + '/uploads/' + path
}
