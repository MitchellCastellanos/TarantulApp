import { getSpeciesCatalogOverride } from '../data/speciesCatalogTranslations'
import { pickSpeciesNarrativeFieldForLocale } from './speciesNarrative.js'
import { toSpeciesSlug } from './speciesSlug'

const SEP = ' · '

function num(v) {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function catalogFor(species, locale) {
  const slug = toSpeciesSlug(species?.scientificName)
  if (!slug) return null
  return getSpeciesCatalogOverride(slug, locale) || getSpeciesCatalogOverride(slug, 'en')
}

/**
 * Approximate hobby temperature ranges (°C) when DB has no explicit range.
 */
export function deriveTempRangeC(species) {
  const world = (species?.hobbyWorld || '').toLowerCase()
  const habitat = (species?.habitatType || '').toLowerCase()
  if (habitat === 'fossorial') return { min: 24, max: 27, approx: true }
  if (world === 'old_world') return { min: 25, max: 28, approx: true }
  if (world === 'new_world') {
    return habitat === 'arboreal'
      ? { min: 24, max: 27, approx: true }
      : { min: 24, max: 26, approx: true }
  }
  return { min: 24, max: 26, approx: true }
}

export function deriveHumidityRange(species) {
  const min = num(species?.humidityMin)
  const max = num(species?.humidityMax)
  if (min != null && max != null) return { min, max, approx: false }
  const habitat = (species?.habitatType || '').toLowerCase()
  if (habitat === 'arboreal') return { min: 65, max: 80, approx: true }
  if (habitat === 'fossorial') return { min: 60, max: 75, approx: true }
  if (habitat === 'terrestrial') return { min: 55, max: 70, approx: true }
  return { min: 60, max: 70, approx: true }
}

function stripEmoji(text) {
  return String(text ?? '')
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\uFE0F]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function translateEnum(t, keys, fallback) {
  if (!fallback) return null
  const raw = String(fallback).trim()
  if (!raw) return null
  const candidates = Array.isArray(keys) ? keys : [keys]
  for (const key of candidates) {
    const label = t(key, { defaultValue: '' })
    if (label && label !== key) return stripEmoji(label)
  }
  return stripEmoji(raw)
}

const SUBSTRATE_PLACEHOLDER = /^(species|unknown|n\/a|na|—|-|\?)$/i

function isUsableSubstrateValue(value) {
  const s = String(value ?? '').trim()
  return Boolean(s) && !SUBSTRATE_PLACEHOLDER.test(s)
}

function compactLabelSnippet(text, maxLen = 72) {
  const s = stripEmoji(String(text ?? '').trim())
  if (!s || SUBSTRATE_PLACEHOLDER.test(s)) return null
  return s.length > maxLen ? `${s.slice(0, maxLen - 1)}…` : s
}

function temperamentLabel(species, t, locale) {
  const catalog = catalogFor(species, locale)
  if (catalog?.temperament) return compactLabelSnippet(catalog.temperament, 56)

  const narrative = pickSpeciesNarrativeFieldForLocale(species?.narrativeI18n, 'temperament', locale)
  if (narrative) return compactLabelSnippet(narrative, 56)

  const raw = species?.temperament
  if (!raw) return null
  const trimmed = String(raw).trim()
  if (trimmed.length > 36 || /[,;]/.test(trimmed)) {
    return compactLabelSnippet(trimmed, 56)
  }

  const slug = trimmed.toLowerCase().replace(/\s+/g, '_')
  return translateEnum(
    t,
    [
      `qr.facts.temperamentValue.${slug}`,
      `timeline.${slug}`,
      `moods.${slug}`,
    ],
    trimmed,
  )
}

function experienceLabel(species, t) {
  const v = species?.experienceLevel
  if (!v) return null
  const cap = v.charAt(0).toUpperCase() + v.slice(1)
  return translateEnum(t, `species.level${cap}`, v)
}

function habitatLabel(species, t) {
  const v = species?.habitatType
  if (!v) return null
  return translateEnum(t, `habitat.${v}`, v)
}

function ventilationLabel(species, t) {
  const v = species?.ventilation
  if (!v) return null
  const map = { low: 'species.ventLow', moderate: 'species.ventModerate', high: 'species.ventHigh' }
  const key = map[String(v).toLowerCase()]
  return key ? translateEnum(t, key, v) : stripEmoji(v)
}

function growthLabel(species, t) {
  const v = species?.growthRate
  if (!v) return null
  const cap = v.charAt(0).toUpperCase() + v.slice(1)
  return translateEnum(t, [`species.growth${cap}`, `species.growth${cap === 'Moderate' ? 'Medium' : cap}`], v)
}

function hobbyWorldLabel(species, t) {
  const w = (species?.hobbyWorld || '').toLowerCase()
  if (w === 'new_world') return t('qr.facts.worldShort.new')
  if (w === 'old_world') return t('qr.facts.worldShort.old')
  return null
}

function substrateLabel(species, locale) {
  const catalog = catalogFor(species, locale)
  if (catalog?.substrate) return compactLabelSnippet(catalog.substrate, 56)

  const narrative = pickSpeciesNarrativeFieldForLocale(species?.narrativeI18n, 'substrate', locale)
  if (narrative && isUsableSubstrateValue(narrative)) return compactLabelSnippet(narrative, 56)

  const raw = species?.substrateType?.trim()
  if (!isUsableSubstrateValue(raw)) return null
  if (raw.length > 36 || /[,;]/.test(raw)) return compactLabelSnippet(raw, 56)
  return stripEmoji(raw)
}

function careNotesLabel(species, locale) {
  const catalog = catalogFor(species, locale)
  if (catalog?.careNotes) return compactLabelSnippet(catalog.careNotes, 88)

  const narrative = pickSpeciesNarrativeFieldForLocale(species?.narrativeI18n, 'careNotes', locale)
  if (narrative) return compactLabelSnippet(narrative, 88)

  const raw = species?.careNotes?.trim()
  return raw ? compactLabelSnippet(raw, 88) : null
}

function joinParts(parts) {
  const usable = parts.filter(Boolean)
  return usable.length ? usable.join(SEP) : null
}

/**
 * Compact localized lines for the care-facts block on QR labels.
 * @returns {string[]}
 */
export function buildCareFactLines(species, t, locale) {
  if (!species) return []

  const lines = []
  const tempLabel = temperamentLabel(species, t, locale)

  const line1 = joinParts([
    tempLabel ? `${t('qr.facts.temperament')}: ${tempLabel}` : null,
    experienceLabel(species, t)
      ? `${t('qr.facts.level')}: ${experienceLabel(species, t)}`
      : null,
  ])
  if (line1) lines.push(line1)

  const line2 = joinParts([
    hobbyWorldLabel(species, t),
    habitatLabel(species, t)
      ? `${t('qr.facts.habitat')}: ${habitatLabel(species, t)}`
      : null,
  ])
  if (line2) lines.push(line2)

  const vent = ventilationLabel(species, t)
  if (vent) {
    lines.push(`${t('qr.facts.ventilation')}: ${vent}`)
  }

  const temp = deriveTempRangeC(species)
  if (temp?.min != null && temp?.max != null) {
    const prefix = temp.approx ? '~' : ''
    lines.push(`${t('qr.facts.temp')}: ${prefix}${temp.min}–${temp.max} °C`)
  }

  const humidity = deriveHumidityRange(species)
  if (humidity?.min != null && humidity?.max != null) {
    const prefix = humidity.approx ? '~' : ''
    lines.push(`${t('qr.facts.humidity')}: ${prefix}${humidity.min}–${humidity.max}%`)
  }

  const sizeMin = num(species?.adultSizeCmMin)
  const sizeMax = num(species?.adultSizeCmMax)
  const sizePart =
    sizeMin != null || sizeMax != null
      ? `${t('qr.facts.size')}: ~${sizeMin ?? '?'}–${sizeMax ?? '?'} cm`
      : null
  const growthPart = growthLabel(species, t)
    ? `${t('qr.facts.growth')}: ${growthLabel(species, t)}`
    : null
  const line4 = joinParts([sizePart, growthPart])
  if (line4) lines.push(line4)

  const substrate = substrateLabel(species, locale)
  if (substrate) {
    lines.push(`${t('qr.facts.substrate')}: ${substrate}`)
  }

  const origin = species?.originRegion?.trim()
  if (origin) {
    lines.push(`${t('qr.facts.origin')}: ${origin}`)
  }

  const notes = careNotesLabel(species, locale)
  if (notes && !lines.some((ln) => ln.includes(notes.slice(0, 24)))) {
    lines.push(notes)
  }

  return lines.slice(0, 8)
}
