/**
 * Base URL del API para axios. Evita `.../api/api` si VITE_API_URL ya termina en `/api`.
 */
export function normalizeViteApiBase() {
  const raw = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '')
  if (!raw) return '/api'
  return raw.endsWith('/api') ? raw : `${raw}/api`
}
