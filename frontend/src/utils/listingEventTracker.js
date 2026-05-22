import marketplaceService from '../services/marketplaceService'

const ANON_KEY = 'tarantulapp_anon_session_id_v1'
const DEDUPE_PREFIX = 'tarantulapp_listing_event_'

function makeUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback UUID-ish for very old browsers (mobile webviews).
  return 'anon-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36)
}

export function getAnonSessionId() {
  try {
    const existing = localStorage.getItem(ANON_KEY)
    if (existing && existing.length > 0) return existing
    const fresh = makeUuid()
    localStorage.setItem(ANON_KEY, fresh)
    return fresh
  } catch {
    return 'anon'
  }
}

function ymdToday() {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function dedupeKey(listingId, kind) {
  return `${DEDUPE_PREFIX}${kind}_${listingId}_${ymdToday()}`
}

function alreadyFiredToday(listingId, kind) {
  try {
    return sessionStorage.getItem(dedupeKey(listingId, kind)) === '1'
  } catch {
    return false
  }
}

function markFiredToday(listingId, kind) {
  try {
    sessionStorage.setItem(dedupeKey(listingId, kind), '1')
  } catch {
    /* ignore */
  }
}

/**
 * Fire-and-forget event recorder for marketplace analytics.
 * Dedupes per (listing, kind) per UTC day inside the same tab session so
 * a refresh does not inflate counters; cross-tab dedupe lives on the server.
 */
export function trackListingEvent(listingId, kind, { force = false } = {}) {
  if (!listingId || !kind) return
  if (!force && alreadyFiredToday(listingId, kind)) return
  markFiredToday(listingId, kind)
  const referrerHost = (() => {
    try {
      if (typeof document !== 'undefined' && document.referrer) {
        return new URL(document.referrer).host || null
      }
    } catch {
      /* ignore */
    }
    return null
  })()
  marketplaceService.recordListingEvent(listingId, {
    kind,
    anonSessionId: getAnonSessionId(),
    referrerHost,
  })
}
