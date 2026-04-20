import { imgUrl } from '../services/api'

const HABITAT_I18N = {
  terrestrial: 'habitatTerrestrial',
  arboreal: 'habitatArboreal',
  fossorial: 'habitatFossorial',
}

const LEVEL_I18N = {
  beginner: 'expBeginner',
  intermediate: 'expIntermediate',
  advanced: 'expAdvanced',
}

function dash(v) {
  if (v === null || v === undefined || v === '') return '–'
  return String(v)
}

/**
 * URL absoluta para og:image a partir de la ficha catálogo o foto iNat/GBIF fallback.
 */
export function discoverHeroImageAbsoluteUrl(species, fallbackPhoto) {
  const raw = species?.referencePhotoUrl || fallbackPhoto?.url
  if (!raw) return null
  const u = imgUrl(raw) || String(raw).trim()
  if (!u) return null
  if (u.startsWith('http://') || u.startsWith('https://')) return u
  if (typeof window !== 'undefined') {
    const path = u.startsWith('/') ? u : `/${u}`
    return `${window.location.origin}${path}`
  }
  return null
}

/**
 * Una línea legible para meta description (hábitat / talla / nivel traducidos).
 */
export function formatDiscoverSeoMetaLine(species, t) {
  if (!species?.scientificName) return ''
  const hKey = species.habitatType && HABITAT_I18N[species.habitatType]
  const habitat = hKey ? t(`discover.${hKey}`) : dash(species.habitatType)
  const lKey = species.experienceLevel && LEVEL_I18N[species.experienceLevel]
  const level = lKey ? t(`discover.${lKey}`) : dash(species.experienceLevel)
  return t('discover.speciesProfileMeta', {
    habitat,
    min: dash(species.adultSizeCmMin),
    max: dash(species.adultSizeCmMax),
    level,
  })
}
