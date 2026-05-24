import { buildCareFactLines, worldBadge } from './careFacts'
import { speciesPublicUrl, specimenPublicUrl } from './publicFrontBaseUrl'

export const QR_CARE_FACTS_STORAGE_KEY = 'ta.qr.careFacts'
export const QR_TARGET_STORAGE_KEY = 'ta.qr.target'

export function readQrCareFactsEnabled() {
  try {
    return localStorage.getItem(QR_CARE_FACTS_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function writeQrCareFactsEnabled(on) {
  try {
    localStorage.setItem(QR_CARE_FACTS_STORAGE_KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

/** @returns {'specimen'|'species'} */
export function readQrTargetMode() {
  try {
    const v = localStorage.getItem(QR_TARGET_STORAGE_KEY)
    return v === 'species' ? 'species' : 'specimen'
  } catch {
    return 'specimen'
  }
}

/** @param {'specimen'|'species'} mode */
export function writeQrTargetMode(mode) {
  try {
    localStorage.setItem(QR_TARGET_STORAGE_KEY, mode === 'species' ? 'species' : 'specimen')
  } catch {
    /* ignore */
  }
}

export function resolveQrUrl(tarantula, qrTargetMode) {
  if (!tarantula) return ''
  if (qrTargetMode === 'species' && tarantula.species?.id != null) {
    return speciesPublicUrl(tarantula.species.id)
  }
  return tarantula.shortId ? specimenPublicUrl(tarantula.shortId) : ''
}

export function buildQrLabelExtras(species, t, locale, careFactsOn) {
  if (!careFactsOn || !species) {
    return { factLines: null, worldBadge: null }
  }
  return {
    factLines: buildCareFactLines(species, t, locale),
    worldBadge: worldBadge(species, t),
  }
}

export function buildQrBulkItem(tarantula, { qrTargetMode, careFactsOn, t, locale }) {
  const url = resolveQrUrl(tarantula, qrTargetMode)
  const name = tarantula.name?.trim() || tarantula.shortId || 'Sin nombre'
  const sci = tarantula.species?.scientificName?.trim() || 'Especie no definida'
  const { factLines, worldBadge: badge } = buildQrLabelExtras(
    tarantula.species,
    t,
    locale,
    careFactsOn,
  )
  return {
    url,
    titleLine1: name,
    titleLine2: sci,
    subtitle: tarantula.shortId ? `ID: ${tarantula.shortId}` : '',
    factLines,
    worldBadge: badge,
  }
}
