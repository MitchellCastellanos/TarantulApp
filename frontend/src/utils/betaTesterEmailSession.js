const PREFIX = 'betaTesterPw:'

export function cacheBetaPasswordForEmail(email, password) {
  if (typeof sessionStorage === 'undefined' || !email || password == null || password === '') return
  try {
    sessionStorage.setItem(`${PREFIX}${String(email).trim().toLowerCase()}`, String(password))
  } catch {
    /* ignore */
  }
}

export function readCachedBetaPassword(email) {
  if (typeof sessionStorage === 'undefined' || !email) return null
  try {
    return sessionStorage.getItem(`${PREFIX}${String(email).trim().toLowerCase()}`)
  } catch {
    return null
  }
}
