/**
 * Manejo centralizado del 401: permite cerrar sesión con React Router en lugar de
 * recargar la página, para que la consola no pierda el log del error.
 */

let unauthorizedHandler = null

function fallbackToLoginWithReload() {
  try {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  } catch (_) { /* ignore */ }
  if (typeof window === 'undefined') return
  const base = import.meta.env?.BASE_URL || '/'
  const path = base.endsWith('/') ? `${base}login` : `${base}/login`
  window.location.assign(path)
}

/**
 * @param {() => void} fn - típicamente logout + navigate('/login'); null restaura solo recarga
 */
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = typeof fn === 'function' ? fn : null
}

/**
 * @param {{ method?: string, url?: string, hadAuthorizationHeader?: boolean }} [detail]
 */
export function notifyUnauthorized(detail = {}) {
  const method = (detail.method || 'GET').toUpperCase()
  const url = detail.url || '(sin url)'
  const authHint =
    detail.hadAuthorizationHeader === true
      ? 'La petición llevaba Authorization: revisa JWT inválido/expirado o JWT_SECRET distinto en backend.'
      : detail.hadAuthorizationHeader === false
        ? 'La petición NO llevaba Authorization: token ausente en cliente o interceptor.'
        : 'Si acabas de guardar algo, revisa Network: ¿falta Authorization o el JWT es inválido?'
  console.error(
    `[TarantulApp] ${method} ${url} → 401 (no autorizado). ${authHint}`,
    detail
  )

  if (unauthorizedHandler) {
    try {
      unauthorizedHandler()
    } catch (e) {
      console.error('[TarantulApp] Handler de 401 falló, se recarga a login:', e)
      fallbackToLoginWithReload()
    }
  } else {
    fallbackToLoginWithReload()
  }
}
