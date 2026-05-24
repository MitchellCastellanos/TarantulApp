import { pickSpeciesNarrativeField } from './speciesNarrative.js'

const SEP = ' · '

/**
 * Approximate hobby temperature ranges (°C).
 * TODO: prefer species.temperatureMin/Max when they exist in the API.
 */
export function deriveTempRangeC(species) {
  // eslint-disable-next-line no-unused-vars
  const _tempMin = species?.temperatureMin
  // eslint-disable-next-line no-unused-vars
  const _tempMax = species?.temperatureMax

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

export function localizedNarrative(species, field, locale) {
  const lang = (locale || 'en').split('-')[0]
  const fromJson = pickSpeciesNarrativeField(species?.narrativeI18n, field, lang)
  if (fromJson) return fromJson
  if (field === 'temperament' && species?.temperament) {
    return String(species.temperament).trim() || null
  }
  return null
}

function translateEnum(t, key, fallback) {
  if (!fallback) return null
  const k = String(fallback).trim()
  if (!k) return null
  const label = t(key, { defaultValue: '' })
  return label && label !== key ? label : k
}

function temperamentLabel(species, t, locale) {
  const narrative = localizedNarrative(species, 'temperament', locale)
  if (narrative) return narrative
  const raw = species?.temperament
  if (!raw) return null
  const slug = String(raw).trim().toLowerCase().replace(/\s+/g, '_')
  return translateEnum(t, `tarantula.${slug}`, raw) || String(raw).trim()
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
  return key ? translateEnum(t, key, v) : String(v)
}

function growthLabel(species, t) {
  const v = species?.growthRate
  if (!v) return null
  const cap = v.charAt(0).toUpperCase() + v.slice(1)
  return translateEnum(t, `species.growth${cap}`, v)
}

function joinParts(parts) {
  const usable = parts.filter(Boolean)
  return usable.length ? usable.join(SEP) : null
}

/**
 * @returns {{ label: string, bg: string, fg: string } | null}
 */
export function worldBadge(species, t) {
  const w = (species?.hobbyWorld || '').toLowerCase()
  if (w === 'new_world') {
    return { label: t('qr.facts.world.new'), bg: '#2e7d32', fg: '#ffffff' }
  }
  if (w === 'old_world') {
    return { label: t('qr.facts.world.old'), bg: '#c62828', fg: '#ffffff' }
  }
  return null
}

/**
 * Compact localized lines for the care-facts block on QR labels.
 * @returns {string[]}
 */
export function buildCareFactLines(species, t, locale) {
  if (!species) return []

  const lines = []

  const line1 = joinParts([
    temperamentLabel(species, t, locale)
      ? `${t('qr.facts.temperament')}: ${temperamentLabel(species, t, locale)}`
      : null,
    experienceLabel(species, t)
      ? `${t('qr.facts.level')}: ${experienceLabel(species, t)}`
      : null,
  ])
  if (line1) lines.push(line1)

  const line2 = joinParts([
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
