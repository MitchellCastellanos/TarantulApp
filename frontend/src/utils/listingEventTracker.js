import marketplaceService from '../services/marketplaceService'

const ANON_KEY = 'tarantulapp_anon_session_id_v1'
const DEDUPE_PREFIX = 'tarantulapp_listing_event_'

function makeUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
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

function storefrontDedupeKey(contextType, contextKey, kind) {
  return `${DEDUPE_PREFIX}sf_${contextType}_${contextKey}_${kind}_${ymdToday()}`
}

function alreadyFiredToday(key) {
  try {
    return sessionStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function markFiredToday(key) {
  try {
    sessionStorage.setItem(key, '1')
  } catch {
    /* ignore */
  }
}

function normalizeCountryCode(raw) {
  if (raw == null) return null
  const c = String(raw).trim().toUpperCase()
  if (c.length === 2) return c
  if (c.length > 2) return c.slice(0, 2)
  return null
}

export function utmFromSearchParams(searchParams) {
  if (!searchParams) return {}
  const source = searchParams.get('utm_source')
  const medium = searchParams.get('utm_medium')
  const campaign = searchParams.get('utm_campaign')
  if (!source && !medium && !campaign) return {}
  return {
    source: source || null,
    medium: medium || null,
    campaign: campaign || null,
  }
}

function referrerHost() {
  try {
    if (typeof document !== 'undefined' && document.referrer) {
      return new URL(document.referrer).host || null
    }
  } catch {
    /* ignore */
  }
  return null
}

/**
 * Fire-and-forget event recorder for marketplace analytics.
 */
export function trackListingEvent(listingId, kind, { force = false, country = null, utm = null } = {}) {
  if (!listingId || !kind) return
  const key = dedupeKey(listingId, kind)
  if (!force && alreadyFiredToday(key)) return
  markFiredToday(key)
  marketplaceService.recordListingEvent(listingId, {
    kind,
    anonSessionId: getAnonSessionId(),
    referrerHost: referrerHost(),
    country: normalizeCountryCode(country),
    utmSource: utm?.source ?? null,
    utmMedium: utm?.medium ?? null,
    utmCampaign: utm?.campaign ?? null,
  })
}

export function trackStorefrontEvent(contextType, contextKey, kind = 'storefront_view', { force = false, country = null } = {}) {
  if (!contextType || !contextKey || !kind) return
  const key = storefrontDedupeKey(contextType, contextKey, kind)
  if (!force && alreadyFiredToday(key)) return
  markFiredToday(key)
  marketplaceService.recordStorefrontEvent({
    contextType,
    contextKey,
    kind,
    anonSessionId: getAnonSessionId(),
    referrerHost: referrerHost(),
    country: normalizeCountryCode(country),
  })
}
