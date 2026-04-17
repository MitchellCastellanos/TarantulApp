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
  const v =
    entry[base] ||
    entry.es ||
    entry.en ||
    entry.fr ||
    Object.values(entry).find((x) => x != null && String(x).trim() !== '')
  return v != null && String(v).trim() !== '' ? String(v) : null
}
