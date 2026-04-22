const THEME_KEY = 'tarantulapp-theme'
const FALLBACK_THEME = 'dark'

/** Disparado en la misma pestaña cuando cambia el tema (localStorage no dispara storage aquí). */
export const THEME_CHANGE_EVENT = 'tarantulapp-theme-change'

export function getStoredTheme() {
  const raw = localStorage.getItem(THEME_KEY)
  return raw === 'light' || raw === 'dark' ? raw : FALLBACK_THEME
}

function syncBrandedIcons(theme) {
  if (typeof document === 'undefined') return
  const href = theme === 'light' ? '/logo-black.png' : '/logo-neon.png'
  const full = theme === 'light' ? `${href}?v=2` : `${href}?v=3`
  const fav = document.getElementById('tarantulapp-favicon')
  if (fav) fav.setAttribute('href', full)
}

export function setStoredTheme(theme) {
  const normalized = theme === 'light' ? 'light' : 'dark'
  localStorage.setItem(THEME_KEY, normalized)
  document.documentElement.setAttribute('data-theme', normalized)
  syncBrandedIcons(normalized)
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: normalized }))
  return normalized
}

export function toggleStoredTheme() {
  const next = getStoredTheme() === 'light' ? 'dark' : 'light'
  return setStoredTheme(next)
}
