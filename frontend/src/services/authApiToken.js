/**
 * Copia del token en memoria alineada con React (AuthProvider).
 * El interceptor de axios lee esto antes que localStorage para evitar carreras
 * donde la UI sigue “logueada” pero el storage ya no tiene JWT.
 */
let sessionTokenSnapshot = null

/** Antes del primer render de React, el interceptor de axios ya puede disparar: lee storage una vez. */
function primeSessionTokenSnapshotFromStorage() {
  try {
    if (typeof localStorage === 'undefined') return
    const raw = localStorage.getItem('token')
    if (raw != null && String(raw).trim() !== '') {
      sessionTokenSnapshot = String(raw).trim()
    }
  } catch {
    /* ignore */
  }
}
primeSessionTokenSnapshotFromStorage()

export function setSessionTokenSnapshot(token) {
  if (token == null || token === '') sessionTokenSnapshot = null
  else sessionTokenSnapshot = String(token).trim()
}

export function getTokenForApiRequest() {
  if (sessionTokenSnapshot) return sessionTokenSnapshot
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null
    return raw != null ? String(raw).trim() : ''
  } catch {
    return ''
  }
}
