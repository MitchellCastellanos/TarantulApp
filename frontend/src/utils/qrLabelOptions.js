import { buildCareFactLines } from './careFacts'
import { speciesPublicUrl, specimenPublicUrl } from './publicFrontBaseUrl'

export const QR_CARE_FACTS_STORAGE_KEY = 'ta.qr.careFacts'
export const QR_TARGET_STORAGE_KEY = 'ta.qr.target'

export function readQrCareFactsEnabled() {
  try {
    const v = localStorage.getItem(QR_CARE_FACTS_STORAGE_KEY)
    if (v === null) return true
    return v === '1'
  } catch {
    return true
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

/**
 * Líneas de título para la etiqueta según destino del QR.
 * Especie genérica → científico + común (sin nombre del ejemplar).
 * @param {import('i18next').TFunction} t
 */
export function buildQrLabelLines(tarantula, qrTargetMode, t) {
  const species = tarantula?.species
  const sci = species?.scientificName?.trim() || ''
  const common = species?.commonName?.trim() || ''
  const undefinedSpecies = t('qr.label.speciesUndefined')

  if (qrTargetMode === 'species' && species?.id != null) {
    return {
      titleLine1: sci || undefinedSpecies,
      titleLine2: common,
      filenameBase: sci || t('qr.label.speciesFileFallback'),
    }
  }

  const name = tarantula?.name?.trim() || tarantula?.shortId || t('qr.label.unnamedSpecimen')
  return {
    titleLine1: name,
    titleLine2: sci || undefinedSpecies,
    filenameBase: name,
  }
}

export function buildQrLabelExtras(species, t, locale, careFactsOn) {
  if (!careFactsOn || !species) {
    return { factLines: null }
  }
  return {
    factLines: buildCareFactLines(species, t, locale),
  }
}

export function buildQrBulkItem(tarantula, { qrTargetMode, careFactsOn, t, locale }) {
  const url = resolveQrUrl(tarantula, qrTargetMode)
  const { titleLine1, titleLine2, filenameBase } = buildQrLabelLines(tarantula, qrTargetMode, t)
  const { factLines } = buildQrLabelExtras(tarantula.species, t, locale, careFactsOn)
  return {
    url,
    titleLine1,
    titleLine2,
    filenameBase,
    factLines,
  }
}

/**
 * Label item for an unclaimed passport (Studio batch mode).
 * @param {import('i18next').TFunction} t
 */
export function buildPassportLabelItem({ passport, batch, t, careFactsOn, locale, species }) {
  const url = passport.publicUrl || specimenPublicUrl(passport.shortId)
  const sci = batch?.scientificName || species?.scientificName || ''
  const common = batch?.commonName || species?.commonName || ''
  const stageKey = passport.stage ? `stages.${passport.stage}` : null
  const sexKey = passport.sex ? `sex.${passport.sex}` : null
  const stageLabel = stageKey ? t(stageKey, passport.stage) : null
  const sexLabel = sexKey ? t(sexKey, passport.sex) : null
  const meta = [stageLabel, sexLabel].filter(Boolean).join(' · ')
  const titleLine1 = sci || passport.shortId
  const subtitleParts = [batch?.name, meta].filter(Boolean)
  const titleLine2 = subtitleParts.length ? subtitleParts.join(' · ') : common

  const notes = passport.labelNotes?.trim()
  const factFromNotes = notes ? [notes] : null
  const { factLines: careFacts } = buildQrLabelExtras(species, t, locale, careFactsOn && species?.id != null)
  const factLines = careFactsOn
    ? [...(careFacts || []), ...(factFromNotes || [])].filter(Boolean).slice(0, 8) || null
    : factFromNotes

  return {
    url,
    titleLine1,
    titleLine2,
    filenameBase: passport.shortId,
    factLines: factLines?.length ? factLines : null,
  }
}

/** @param {import('i18next').TFunction} t */
export function buildBatchPassportItems(passports, batch, { t, careFactsOn, locale, species }) {
  return (passports || []).map((passport) =>
    buildPassportLabelItem({ passport, batch, t, careFactsOn, locale, species }),
  )
}
