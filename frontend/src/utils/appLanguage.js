/** Normalizes i18n language to base resource code en | es | fr. */
export function appLangBase(lang) {
  if (!lang) return 'en'
  const l = String(lang).toLowerCase()
  if (l.startsWith('es')) return 'es'
  if (l.startsWith('fr')) return 'fr'
  if (l.startsWith('en')) return 'en'
  return 'en'
}

/** Exact locale code when user picked or detected a regional variant. */
export function appLangExact(lang) {
  const l = String(lang || 'en')
  if (l.toLowerCase() === 'es-mx') return 'es-MX'
  if (l.toLowerCase() === 'fr-ca') return 'fr-CA'
  return appLangBase(lang)
}
