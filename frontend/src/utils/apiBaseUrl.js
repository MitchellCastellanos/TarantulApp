/**
 * Base URL del API para axios. Evita `.../api/api` si VITE_API_URL ya termina en `/api`.
 */
export function resolveViteApiOrigin() {
  const raw = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '')
  if (!raw) return ''
  // En producción web forzamos el host canónico para evitar bloqueos por CSP
  // cuando alguien deja el dominio directo de Railway en variables de entorno.
  if (typeof window !== 'undefined') {
    const host = String(window.location?.hostname || '').toLowerCase()
    if ((host === 'tarantulapp.com' || host.endsWith('.tarantulapp.com')) && /(?:^https?:\/\/)?[^/]*\.up\.railway\.app$/i.test(raw)) {
      return 'https://api.tarantulapp.com'
    }
  }
  return raw
}

export function normalizeViteApiBase() {
  const raw = resolveViteApiOrigin()
  if (!raw) return '/api'
  return raw.endsWith('/api') ? raw : `${raw}/api`
}
