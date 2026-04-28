/** Local persistence for “tester bypass” when the coming-soon splash is enabled. */
export const COMING_SOON_BYPASS_STORAGE_KEY = 'tarantulapp_cs_bypass_v1'
export const COMING_SOON_TESTER_PREFILL_STORAGE_KEY = 'tarantulapp_cs_tester_prefill_v1'

export function isComingSoonEnabled() {
  return String(import.meta.env.VITE_PUBLIC_COMING_SOON || '').toLowerCase() === 'true'
}

export function readTesterBypass() {
  try {
    return localStorage.getItem(COMING_SOON_BYPASS_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function writeTesterBypass() {
  try {
    localStorage.setItem(COMING_SOON_BYPASS_STORAGE_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function writeTesterPrefill(email, password) {
  try {
    const safeEmail = String(email || '').trim()
    const safePassword = String(password || '')
    if (!safeEmail || !safePassword) return
    localStorage.setItem(
      COMING_SOON_TESTER_PREFILL_STORAGE_KEY,
      JSON.stringify({ email: safeEmail, password: safePassword, createdAt: Date.now() }),
    )
  } catch {
    /* ignore */
  }
}

export function readTesterPrefill() {
  try {
    const raw = localStorage.getItem(COMING_SOON_TESTER_PREFILL_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const email = String(parsed?.email || '').trim()
    const password = String(parsed?.password || '')
    if (!email || !password) return null
    return { email, password }
  } catch {
    return null
  }
}

export function clearTesterPrefill() {
  try {
    localStorage.removeItem(COMING_SOON_TESTER_PREFILL_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function clearTesterBypass() {
  try {
    localStorage.removeItem(COMING_SOON_BYPASS_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
