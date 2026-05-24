import { pickSpeciesNarrativeFieldForLocale } from './speciesNarrative.js'

const SEP = ' · '

/**
 * Approximate hobby temperature ranges (°C).
 * TODO: prefer species.temperatureMin/Max when they exist in the API.
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

function isCatalogProse(text) {
  const s = String(text ?? '').trim()
  return s.length > 36 || /[,;]/.test(s)
}

function temperamentLabel(species, t, locale) {
  const narrative = pickSpeciesNarrativeFieldForLocale(species?.narrativeI18n, 'temperament', locale)
  if (narrative) return narrative

  const raw = species?.temperament
  if (!raw) return null
  const trimmed = String(raw).trim()

  if (isCatalogProse(trimmed)) {
    const base = (locale || 'en').split('-')[0]
    if (base !== 'es') return null
    return trimmed.length > 72 ? `${trimmed.slice(0, 69)}…` : trimmed
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
    ventilationLabel(species, t)
      ? `${t('qr.facts.ventilation')}: ${ventilationLabel(species, t)}`
      : null,
  ])
  if (line2) lines.push(line2)

  const temp = deriveTempRangeC(species)
  const humMin = species?.humidityMin
  const humMax = species?.humidityMax
  const tempPart =
    temp?.min != null && temp?.max != null
      ? `${t('qr.facts.temp')}: ~${temp.min}–${temp.max} °C`
      : null
  const humPart =
    humMin != null && humMax != null
      ? `${t('qr.facts.humidity')}: ${humMin}–${humMax} %`
      : null
  const line3 = joinParts([tempPart, humPart])
  if (line3) lines.push(line3)

  const sizeMin = species?.adultSizeCmMin
  const sizeMax = species?.adultSizeCmMax
  const sizePart =
    sizeMin != null || sizeMax != null
      ? `${t('qr.facts.size')}: ~${sizeMin ?? '?'}–${sizeMax ?? '?'} cm`
      : null
  const growthPart = growthLabel(species, t)
    ? `${t('qr.facts.growth')}: ${growthLabel(species, t)}`
    : null
  const line4 = joinParts([sizePart, growthPart])
  if (line4) lines.push(line4)

  const origin = species?.originRegion?.trim()
  if (origin) {
    lines.push(`${t('qr.facts.origin')}: ${origin}`)
  }

  return lines.slice(0, 5)
}
