import axios, { AxiosHeaders } from 'axios'
import { normalizeViteApiBase } from '../utils/apiBaseUrl'
import { getTokenForApiRequest } from './authApiToken'
import { notifyUnauthorized } from './authSession'

const api = axios.create({
  baseURL: normalizeViteApiBase(),
  headers: { 'Content-Type': 'application/json' }
})

const PUBLIC_AUTH_TAILS = ['auth/login', 'auth/register', 'auth/forgot-password', 'auth/reset-password', 'auth/oauth/google']

function apiPathTail(config) {
  const raw = String(config.url || '').split('?')[0]
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) {
    try {
      return new URL(raw).pathname.replace(/^\/api\//i, '').replace(/^\//, '').replace(/\/+$/, '')
    } catch {
      return ''
    }
  }
  const base = (config.baseURL || '').replace(/\/+$/, '')
  const pathOnly = raw.replace(/^\/+/, '')
  if (/^https?:\/\//i.test(base)) {
    try {
      const pathname = new URL(pathOnly, base.endsWith('/') ? base : `${base}/`).pathname
      return pathname.replace(/^\/api\//i, '').replace(/^\//, '').replace(/\/+$/, '')
    } catch {
      return ''
    }
  }
  const absolute = base ? `${base}/${pathOnly}`.replace(/([^:])\/+/g, '$1/') : `/${pathOnly}`
  return absolute.replace(/^\/api\//i, '').replace(/^\//, '').replace(/\/+$/, '')
}

/**
 * Login/register/forgot/reset deben ir SIN Bearer: un JWT viejo rompe POST en Spring (403 / rechazo).
 * Axios puede dejar {@code url} como {@code auth/login}, {@code /auth/login} o URL absoluta;
 * {@code baseURL} puede ser relativo ({@code /api}) o absoluto ({@code http://host:8080/api}).
 */
function isPublicAuthEndpoint(config) {
  const tail = apiPathTail(config)
  if (PUBLIC_AUTH_TAILS.includes(tail)) return true
  const base = String(config.baseURL || '').trim()
  const path = String(config.url || '').split('?')[0]
  let combined = ''
  try {
    combined = /^https?:\/\//i.test(path)
      ? path
      : /^https?:\/\//i.test(base)
        ? new URL(path.replace(/^\//, ''), base.endsWith('/') ? base : `${base}/`).href
        : `${base}${path}`
  } catch {
    combined = `${base}${path}`
  }
  return /\/api\/auth\/(login|register|forgot-password|reset-password|oauth\/google)(\?|$|\/)/i.test(combined)
}

// Adjunta el JWT en cada request automáticamente (AxiosHeaders evita que se pierda en merges de POST)
api.interceptors.request.use((config) => {
  const headers = AxiosHeaders.from(config.headers)
  if (isPublicAuthEndpoint(config)) {
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
      // Invitado sin Bearer: un 401 del backend (p. ej. /api/species mal configurado) NO debe cerrar sesión ni mandar a /login.
      if (!hadAuth) {
        return Promise.reject(error)
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
  const s = String(path).trim()
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
  if (s.startsWith('/uploads/')) {
    return base ? `${base}${s}` : s
  }
  const slug = s.replace(/^\/+/, '')
  const absPath = `/uploads/${slug}`
  return base ? `${base}${absPath}` : absPath
}
