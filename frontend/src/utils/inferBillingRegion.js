/** Stripe billing regions we ship Price IDs for (must match backend {@code BillingController}). */
export const BILLING_REGION_CODES = ['US', 'CA', 'MX', 'CO']

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
 * Best-effort region for Stripe Checkout (US, CA, MX, CO). Not geo-IP — uses device locale + timezone.
 * Query {@code ?region=MX} overrides for testing/support.
 */
export function inferBillingRegion() {
  if (typeof window === 'undefined') return 'US'

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

  return 'US'
}
