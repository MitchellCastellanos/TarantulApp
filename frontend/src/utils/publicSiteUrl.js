/** Canonical site origin for links shown to users (stores, privacy). Prefer env over runtime. */
export function getPublicSiteOrigin() {
  const fromEnv = typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_SITE_URL
  if (fromEnv != null && String(fromEnv).trim() !== '') {
    return String(fromEnv).trim().replace(/\/+$/, '')
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'https://tarantulapp.com'
}

export function publicAccountSettingsUrl() {
  return `${getPublicSiteOrigin()}/account`
}

export function publicAccountDeletionArticleUrl() {
  return `${getPublicSiteOrigin()}/account-deletion`
}
