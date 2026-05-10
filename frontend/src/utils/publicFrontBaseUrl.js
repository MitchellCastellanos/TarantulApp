/**
 * Origen canónico del sitio (sin barra final) para enlaces compartibles: referidos, casos públicos sex-ID, etc.
 * - Si existe {@code import.meta.env.VITE_PUBLIC_SITE_URL}, gana siempre (staging/prod/manual).
 * - Si el WebView/local es localhost o similar, usa producción por defecto (Capacitor / vite dev sin env).
 */

function normalizeOrigin(url) {
  return String(url || '').trim().replace(/\/+$/, '')
}

function isLoopbackOrigin(origin) {
  if (!origin) return true
  try {
    const u = new URL(origin)
    const h = (u.hostname || '').toLowerCase()
    return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h.endsWith('.local')
  } catch {
    return true
  }
}

/** Full URL for a specimen public card (printed QR). Never uses localhost when env or fallback prod is set. */
export function specimenPublicUrl(shortId) {
  const id = String(shortId || '').trim()
  if (!id) return ''
  return `${resolvePublicFrontOrigin()}/t/${encodeURIComponent(id)}`
}

/** @returns {string} e.g. https://tarantulapp.com */
export function resolvePublicFrontOrigin() {
  const env = normalizeOrigin(import.meta.env?.VITE_PUBLIC_SITE_URL || '')
  if (/^https?:\/\//i.test(env)) {
    return env
  }
  if (typeof window === 'undefined' || !window.location?.origin) {
    return 'https://tarantulapp.com'
  }
  const origin = normalizeOrigin(window.location.origin)
  if (isLoopbackOrigin(origin)) {
    return 'https://tarantulapp.com'
  }
  return origin
}
