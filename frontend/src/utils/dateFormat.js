/**
 * Formats stored UTC/ISO instants in the browser's local timezone (the user's zone).
 */

export function getUserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return undefined
  }
}

/** Map short i18n codes to BCP-47 locales for formatting (en → UK, not US). */
export function localeForI18n(i18nLang) {
  const base = (i18nLang || 'en').split('-')[0]
  const map = { en: 'en-GB', fr: 'fr-FR' }
  return map[base] || i18nLang || 'en-GB'
}

function formatWithZone(iso, i18nLang, options) {
  if (!iso) return '–'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '–'
  const tz = getUserTimeZone()
  return d.toLocaleString(localeForI18n(i18nLang), {
    timeZone: tz,
    ...options,
  })
}

/** Event log lines: date + time in user's timezone. */
export function formatEventDateTime(iso, i18nLang) {
  return formatWithZone(iso, i18nLang, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Calendar date only (still in user's TZ so midnight UTC does not shift the day wrong). */
export function formatDateInUserZone(iso, i18nLang) {
  if (!iso) return '–'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '–'
  const tz = getUserTimeZone()
  return d.toLocaleDateString(localeForI18n(i18nLang), {
    timeZone: tz,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Reminders / due dates with time, user zone. */
export function formatDateTimeInUserZone(iso, i18nLang) {
  return formatWithZone(iso, i18nLang, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
