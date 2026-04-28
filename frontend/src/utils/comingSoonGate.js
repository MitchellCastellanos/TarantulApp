/** Local persistence for “tester bypass” when the coming-soon splash is enabled. */
export const COMING_SOON_BYPASS_STORAGE_KEY = 'tarantulapp_cs_bypass_v1'

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

export function clearTesterBypass() {
  try {
    localStorage.removeItem(COMING_SOON_BYPASS_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function getTesterAccessCode() {
  return String(import.meta.env.VITE_TESTER_ACCESS_CODE || '').trim()
}
