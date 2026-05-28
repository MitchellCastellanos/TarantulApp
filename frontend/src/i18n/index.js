import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './en.json'
import es from './es.json'
import fr from './fr.json'
import esMX from './es-MX.json'
import frCA from './fr-CA.json'

function deepMerge(base, override) {
  const out = { ...base }
  for (const key of Object.keys(override || {})) {
    const b = base?.[key]
    const o = override[key]
    if (o && typeof o === 'object' && !Array.isArray(o) && b && typeof b === 'object' && !Array.isArray(b)) {
      out[key] = deepMerge(b, o)
    } else {
      out[key] = o
    }
  }
  return out
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      'es-MX': { translation: deepMerge(es, esMX) },
      'fr-CA': { translation: deepMerge(fr, frCA) },
    },
    fallbackLng: {
      'es-MX': ['es', 'en'],
      'fr-CA': ['fr', 'en'],
      default: ['en'],
    },
    supportedLngs: ['en', 'es', 'es-MX', 'fr', 'fr-CA'],
    nonExplicitSupportedLngs: false,
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'tarantulapp-lang',
    },
    interpolation: { escapeValue: false },
  })

/** Mantiene <html lang> en sync con el idioma activo (SEO + accesibilidad). */
function syncHtmlLang(lng) {
  if (typeof document === 'undefined') return
  const lang = lng || i18n.resolvedLanguage || i18n.language || 'en'
  document.documentElement.setAttribute('lang', lang)
}
syncHtmlLang(i18n.resolvedLanguage || i18n.language)
i18n.on('languageChanged', syncHtmlLang)

export default i18n
