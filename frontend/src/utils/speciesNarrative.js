/**
 * @param {Record<string, Record<string, string>>|null|undefined} narrative from API (narrativeI18n)
 * @param {string} field top-level key (e.g. temperament, substrate, careNotes, or optional premoltSigns, moltCare, …)
 * @param {string} i18nLanguage e.g. 'en', 'fr'
 */
export function pickSpeciesNarrativeField(narrative, field, i18nLanguage) {
  if (!narrative || typeof narrative !== 'object') return null
  const entry = narrative[field]
  if (!entry || typeof entry !== 'object') return null
  const base = (i18nLanguage || 'en').split('-')[0]
  const byLocale = { en: ['fr', 'es'], fr: ['en', 'es'] }[base] || ['en', 'fr', 'es']
  const v =
    entry[base] ||
    byLocale.map((k) => entry[k]).find((x) => x != null && String(x).trim() !== '') ||
    Object.values(entry).find((x) => x != null && String(x).trim() !== '')
  return v != null && String(v).trim() !== '' ? String(v) : null
}
