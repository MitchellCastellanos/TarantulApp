/** Stripe billing regions (must match backend {@code BillingController}). */
export const BILLING_REGION_CODES = ['US', 'CA', 'MX', 'CO', 'INT']

/** Vendor program live: US/CA flat Stripe; MX dynamic tier; CO flat when configured. */
export const VENDOR_PROGRAM_REGION_CODES = ['US', 'CA', 'MX', 'CO']

/** Flat vendor subscription checkout (monthly/yearly) — not México dynamic tier. */
export const VENDOR_FLAT_CHECKOUT_REGION_CODES = ['US', 'CA', 'CO']

/** @deprecated use {@link isVendorProgramRegion} */
export const VENDOR_CHECKOUT_REGION_CODES = VENDOR_PROGRAM_REGION_CODES

const MX_ZONES = new Set([
  'america/mexico_city',
  'america/cancun',
  'america/merida',
  'america/monterrey',
  'america/mazatlan',
  'america/chihuahua',
  'america/hermosillo',
  'america/tijuana',
  'america/matamoros',
  'america/bahia_banderas',
  'america/ojinaga',
])

const CA_ZONES = new Set([
  'america/toronto',
  'america/vancouver',
  'america/winnipeg',
  'america/edmonton',
  'america/halifax',
  'america/st_johns',
  'america/moncton',
  'america/glace_bay',
  'america/goose_bay',
  'america/blanc-sablon',
  'america/coral_harbour',
  'america/creston',
  'america/dawson',
  'america/dawson_creek',
  'america/fort_nelson',
  'america/rainy_river',
  'america/rankin_inlet',
  'america/regina',
  'america/resolute',
  'america/swift_current',
  'america/thunder_bay',
  'america/yellowknife',
  'america/whitehorse',
  'america/iqaluit',
  'america/inuvik',
  'america/pangnirtung',
])

function inferFromTimeZone(tzRaw) {
  if (!tzRaw || typeof tzRaw !== 'string') return null
  const z = tzRaw.trim().toLowerCase()
  if (z === 'america/bogota') return 'CO'
  if (MX_ZONES.has(z)) return 'MX'
  if (CA_ZONES.has(z) || tzRaw.startsWith('Canada/')) return 'CA'
  return null
}

function inferFromLanguages() {
  if (typeof navigator === 'undefined') return null
  const list = []
  if (Array.isArray(navigator.languages)) list.push(...navigator.languages)
  if (navigator.language) list.push(navigator.language)
  for (const raw of list) {
    const tag = String(raw).toLowerCase().replace('_', '-')
    if (tag.startsWith('es-mx')) return 'MX'
    if (tag.startsWith('es-co')) return 'CO'
    if (tag.startsWith('fr-ca') || tag.startsWith('en-ca')) return 'CA'
    if (tag.startsWith('en-us')) return 'US'
  }
  return null
}

/**
 * Best-effort region for Stripe Checkout (US, CA, MX, CO, INT).
 * Americas map to local pricing; everything else → INT (USD).
 * Query {@code ?region=MX} overrides for testing/support.
 */
export function inferBillingRegion() {
  if (typeof window === 'undefined') return 'INT'

  try {
    const q = new URLSearchParams(window.location.search).get('region')
    const qu = q != null ? String(q).trim().toUpperCase() : ''
    if (qu && BILLING_REGION_CODES.includes(qu)) return qu
  } catch (_) {
    /* ignore */
  }

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const fromTz = inferFromTimeZone(tz)
    if (fromTz) return fromTz
  } catch (_) {
    /* ignore */
  }

  const fromLang = inferFromLanguages()
  if (fromLang) return fromLang

  return 'INT'
}

export function isVendorProgramRegion(region) {
  return VENDOR_PROGRAM_REGION_CODES.includes(region)
}

export function isVendorDynamicTierRegion(region) {
  return region === 'MX'
}

export function isVendorFlatCheckoutRegion(region) {
  return VENDOR_FLAT_CHECKOUT_REGION_CODES.includes(region)
}

/** @deprecated use {@link isVendorProgramRegion} */
export function isVendorCheckoutRegion(region) {
  return isVendorProgramRegion(region)
}
