/**
 * Length units for tarantula sizes.
 *
 * Storage is always cm (single source of truth in the backend). This module
 * converts to/from inches at the UI edge based on the keeper's geography:
 * profileCountry US/CA → inches (hobby convention in North American keeping),
 * everything else → cm. Falls back to the browser locale when no country is set.
 */

const CM_PER_INCH = 2.54
const IMPERIAL_COUNTRIES = new Set(['US', 'CA'])

export function getUnitSystem(user) {
  const country = (user?.profileCountry || '').toUpperCase()
  if (country) return IMPERIAL_COUNTRIES.has(country) ? 'imperial' : 'metric'
  if (typeof navigator !== 'undefined') {
    const lang = (navigator.language || '').toLowerCase()
    if (lang.endsWith('-us') || lang.endsWith('-ca') || lang === 'en-us' || lang === 'en-ca') {
      return 'imperial'
    }
  }
  return 'metric'
}

export function unitLabel(system) {
  return system === 'imperial' ? 'in' : 'cm'
}

function trimDecimal(n, maxDecimals) {
  const fixed = n.toFixed(maxDecimals)
  return fixed.replace(/\.?0+$/, '')
}

/** cm number → string to seed a number input in the user's system. */
export function cmToInput(cm, system) {
  if (cm == null || cm === '') return ''
  const n = Number(cm)
  if (!Number.isFinite(n)) return ''
  if (system === 'imperial') return trimDecimal(n / CM_PER_INCH, 2)
  return trimDecimal(n, 2)
}

/** User-entered value in their system → cm number for the API. */
export function inputToCm(value, system) {
  if (value == null || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  if (system === 'imperial') return Number((n * CM_PER_INCH).toFixed(2))
  return n
}

/** cm → number-only value for charts/axes in user's system. */
export function cmToDisplayNumber(cm, system) {
  if (cm == null || cm === '') return null
  const n = Number(cm)
  if (!Number.isFinite(n)) return null
  if (system === 'imperial') return Number((n / CM_PER_INCH).toFixed(2))
  return n
}

/** cm → human string with unit suffix (read-only displays). */
export function formatSize(cm, system) {
  if (cm == null || cm === '') return ''
  const n = Number(cm)
  if (!Number.isFinite(n)) return ''
  if (system === 'imperial') return `${trimDecimal(n / CM_PER_INCH, 2)} in`
  const s = Number.isInteger(n) ? String(n) : trimDecimal(n, 1)
  return `${s} cm`
}

/** Suggested numeric step for inputs (finer for inches). */
export function inputStep(system) {
  return system === 'imperial' ? '0.05' : '0.1'
}
