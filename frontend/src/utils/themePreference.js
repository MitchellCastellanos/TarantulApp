const THEME_KEY = 'tarantulapp-theme'
const FALLBACK_THEME = 'dark'

export function getStoredTheme() {
  const raw = localStorage.getItem(THEME_KEY)
  return raw === 'light' || raw === 'dark' ? raw : FALLBACK_THEME
}

export function setStoredTheme(theme) {
  const normalized = theme === 'light' ? 'light' : 'dark'
  localStorage.setItem(THEME_KEY, normalized)
  document.documentElement.setAttribute('data-theme', normalized)
  return normalized
}

export function toggleStoredTheme() {
  const next = getStoredTheme() === 'light' ? 'dark' : 'light'
  return setStoredTheme(next)
}
