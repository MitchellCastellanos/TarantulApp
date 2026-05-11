const STORAGE_KEY = 'ta_play_store_web_banner_dismissed_v2'

export function isPlayStoreWebBannerDismissed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissPlayStoreWebBanner() {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    /* ignore */
  }
}
