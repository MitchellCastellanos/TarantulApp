/** Normalizes i18n language (e.g. en-GB from detector) to app resource code es | en | fr. */
export function appLangBase(lang) {
  if (!lang) return 'es'
  const b = String(lang).split('-')[0].toLowerCase()
  return ['es', 'en', 'fr'].includes(b) ? b : 'es'
}
