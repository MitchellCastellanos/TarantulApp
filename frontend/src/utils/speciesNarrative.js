/**
 * @param {Record<string, Record<string, string>>|null|undefined} narrative from API (narrativeI18n)
 * @param {'temperament'|'substrate'|'careNotes'} field
 * @param {string} i18nLanguage e.g. 'en', 'fr', 'es'
 */
export function pickSpeciesNarrativeField(narrative, field, i18nLanguage) {
  if (!narrative || typeof narrative !== 'object') return null
  const entry = narrative[field]
  if (!entry || typeof entry !== 'object') return null
  const base = (i18nLanguage || 'es').split('-')[0]
  // Orden consciente: no poner "es" antes de "en" (evita mezcla ingles+espanol con UI en en).
  const byLocale = { es: ['en', 'fr'], en: ['fr', 'es'], fr: ['en', 'es'] }[base] || ['en', 'es', 'fr']
  const v =
    entry[base] ||
    byLocale.map((k) => entry[k]).find((x) => x != null && String(x).trim() !== '') ||
    Object.values(entry).find((x) => x != null && String(x).trim() !== '')
  return v != null && String(v).trim() !== '' ? String(v) : null
}
