/** Normalizes i18n language (e.g. en-GB from detector) to app resource code en | es | fr. */
export function appLangBase(lang) {
  if (!lang) return 'en'
  const b = String(lang).split('-')[0].toLowerCase()
  return ['en', 'es', 'fr'].includes(b) ? b : 'en'
}
