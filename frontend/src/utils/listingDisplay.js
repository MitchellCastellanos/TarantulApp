import { imgUrl } from '../services/api'
import { resolveViteApiOrigin } from './apiBaseUrl'

const MONARCH_HOST_FRAGMENT = 'monarchreptiles.com'

/** Decode common HTML entities from WooCommerce titles (also fixes stale DB rows in the UI). */
export function decodeListingTitle(title) {
  if (!title) return title
  const el = document.createElement('textarea')
  el.innerHTML = title
  return el.value
}

/** Partner store images are proxied through our API to avoid hotlink blocks. */
export function partnerListingImageUrl(imageUrl) {
  if (!imageUrl) return null
  const s = String(imageUrl).trim()
  if (!s.startsWith('http://') && !s.startsWith('https://')) {
    return imgUrl(s) || s
  }
  try {
    const host = new URL(s).hostname.toLowerCase()
    if (host.includes(MONARCH_HOST_FRAGMENT)) {
      const base = resolveViteApiOrigin() || ''
      return `${base}/api/public/marketplace/partner-listing-image?url=${encodeURIComponent(s)}`
    }
  } catch {
    // fall through
  }
  return s
}
