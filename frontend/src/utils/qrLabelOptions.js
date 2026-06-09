import { buildCareFactLines } from './careFacts'
import { partnerStorefrontPath } from './partnerStorefront'
import { resolvePublicFrontOrigin, speciesPublicUrl, specimenPublicUrl } from './publicFrontBaseUrl'

export const QR_CARE_FACTS_STORAGE_KEY = 'ta.qr.careFacts'
export const QR_TARGET_STORAGE_KEY = 'ta.qr.target'
export const QR_LAYOUT_STORAGE_KEY = 'ta.qr.layout'
export const QR_VENDOR_SIZE_STORAGE_KEY = 'ta.qr.vendorSize'

/** @typedef {'simple'|'care'|'vendor-passport'} QrLayoutMode */
/** @typedef {'specimen'|'species'|'storefront'} QrTargetMode */

export const QR_LAYOUT_MODES = /** @type {const} */ (['simple', 'care', 'vendor-passport'])
export const QR_TARGET_MODES = /** @type {const} */ (['specimen', 'species', 'storefront'])

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

/** @returns {QrTargetMode} */
export function readQrTargetMode() {
  try {
    const v = localStorage.getItem(QR_TARGET_STORAGE_KEY)
    if (v === 'species') return 'species'
    if (v === 'storefront') return 'storefront'
    return 'specimen'
  } catch {
    return 'specimen'
  }
}

/** @param {QrTargetMode} mode */
export function writeQrTargetMode(mode) {
  try {
    const normalized =
      mode === 'species' ? 'species' : mode === 'storefront' ? 'storefront' : 'specimen'
    localStorage.setItem(QR_TARGET_STORAGE_KEY, normalized)
  } catch {
    /* ignore */
  }
}

/** @returns {QrLayoutMode} */
export function readQrLayoutMode() {
  try {
    const v = localStorage.getItem(QR_LAYOUT_STORAGE_KEY)
    if (v === 'vendor-passport') return 'vendor-passport'
    if (v === 'care') return 'care'
    if (v === 'simple') return 'simple'
    return 'simple'
  } catch {
    return 'simple'
  }
}

/** @param {QrLayoutMode} mode */
export function writeQrLayoutMode(mode) {
  try {
    const normalized =
      mode === 'vendor-passport' ? 'vendor-passport' : mode === 'care' ? 'care' : 'simple'
    localStorage.setItem(QR_LAYOUT_STORAGE_KEY, normalized)
  } catch {
    /* ignore */
  }
}

export function readQrVendorSizeId() {
  try {
    const v = localStorage.getItem(QR_VENDOR_SIZE_STORAGE_KEY)
    return v && ['vial', 'small', 'medium', 'large'].includes(v) ? v : 'medium'
  } catch {
    return 'medium'
  }
}

export function writeQrVendorSizeId(id) {
  try {
    localStorage.setItem(QR_VENDOR_SIZE_STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
}

/**
 * Resolve effective layout: explicit mode wins; legacy auto picks care when facts are on.
 * @param {QrLayoutMode|null|undefined} layoutMode
 * @param {boolean} careFactsOn
 */
export function resolveEffectiveLayoutMode(layoutMode, careFactsOn) {
  if (layoutMode === 'vendor-passport') return 'vendor-passport'
  if (layoutMode === 'care') return 'care'
  if (layoutMode === 'simple') return 'simple'
  return careFactsOn ? 'care' : 'simple'
}

/** @param {{ publicHandle?: string|null }} user */
export function resolveStorefrontPublicUrl(user) {
  const handle = String(user?.publicHandle || '').trim()
  if (!handle) return ''
  const path = partnerStorefrontPath(handle)
  if (!path) return ''
  return `${resolvePublicFrontOrigin()}${path}`
}

/**
 * @param {object|null|undefined} tarantula
 * @param {QrTargetMode} qrTargetMode
 * @param {{ publicHandle?: string|null }|null} [vendorUser]
 */
export function resolveQrUrl(tarantula, qrTargetMode, vendorUser = null) {
  if (!tarantula) return ''
  if (qrTargetMode === 'storefront') {
    return resolveStorefrontPublicUrl(vendorUser)
  }
  if (qrTargetMode === 'species' && tarantula.species?.id != null) {
    return speciesPublicUrl(tarantula.species.id)
  }
  return tarantula.shortId ? specimenPublicUrl(tarantula.shortId) : ''
}

/** Passport batch URL (always specimen/passport). */
export function resolvePassportQrUrl(passport) {
  if (!passport) return ''
  return passport.publicUrl || specimenPublicUrl(passport.shortId)
}

/**
 * Líneas de título para la etiqueta según destino del QR.
 * Especie genérica → científico + común (sin nombre del ejemplar).
 * Vendor-passport → común + científico.
 * @param {import('i18next').TFunction} t
 */
export function buildQrLabelLines(tarantula, qrTargetMode, t, layoutMode = null) {
  const species = tarantula?.species
  const sci = species?.scientificName?.trim() || ''
  const common = species?.commonName?.trim() || ''
  const undefinedSpecies = t('qr.label.speciesUndefined')
  const isVendorPassport = layoutMode === 'vendor-passport'

  if (qrTargetMode === 'species' && species?.id != null) {
    return {
      titleLine1: isVendorPassport ? common || sci || undefinedSpecies : sci || undefinedSpecies,
      titleLine2: isVendorPassport ? sci : common,
      filenameBase: sci || t('qr.label.speciesFileFallback'),
    }
  }

  if (isVendorPassport) {
    const name = common || tarantula?.name?.trim() || t('qr.label.unnamedSpecimen')
    return {
      titleLine1: name,
      titleLine2: sci || undefinedSpecies,
      filenameBase: sci || tarantula?.name || tarantula?.shortId || 'label',
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

/**
 * Operation / storefront name for Verified Origin block — never the public handle.
 * @param {{ storefrontName?: string }|null} profile
 */
export function resolveVendorDisplayName(profile) {
  if (!profile) return ''
  return String(profile.storefrontName || '').trim()
}

export function buildQrBulkItem(tarantula, { qrTargetMode, careFactsOn, t, locale, layoutMode, vendorUser, vendorProfile }) {
  const effectiveLayout = resolveEffectiveLayoutMode(layoutMode, careFactsOn)
  const url = resolveQrUrl(tarantula, qrTargetMode, vendorUser)
  const { titleLine1, titleLine2, filenameBase } = buildQrLabelLines(
    tarantula,
    qrTargetMode,
    t,
    effectiveLayout,
  )
  const { factLines } = buildQrLabelExtras(tarantula.species, t, locale, careFactsOn)
  return {
    url,
    titleLine1,
    titleLine2,
    filenameBase,
    factLines,
    shortIdLine: tarantula.shortId || null,
    vendorName: effectiveLayout === 'vendor-passport' ? resolveVendorDisplayName(vendorProfile) : null,
  }
}

/**
 * Label item for an unclaimed passport (Studio batch mode).
 * @param {import('i18next').TFunction} t
 */
export function buildPassportLabelItem({
  passport,
  batch,
  t,
  careFactsOn,
  locale,
  species,
  layoutMode = 'vendor-passport',
  vendorUser = null,
  vendorProfile = null,
  verifiedOrigin = false,
}) {
  const url = resolvePassportQrUrl(passport)
  const sci = batch?.scientificName || species?.scientificName || ''
  const common = batch?.commonName || species?.commonName || ''
  const stageKey = passport.stage ? `stages.${passport.stage}` : null
  const sexKey = passport.sex ? `sex.${passport.sex}` : null
  const stageLabel = stageKey ? t(stageKey, passport.stage) : null
  const sexLabel = sexKey ? t(sexKey, passport.sex) : null
  const meta = [stageLabel, sexLabel].filter(Boolean).join(' · ')
  const effectiveLayout = resolveEffectiveLayoutMode(layoutMode, careFactsOn)
  const isVendor = effectiveLayout === 'vendor-passport'

  const titleLine1 = isVendor ? common || sci || passport.shortId : sci || passport.shortId
  const subtitleParts = isVendor
    ? [sci, meta].filter(Boolean)
    : [batch?.name, meta].filter(Boolean)
  const titleLine2 = subtitleParts.length ? subtitleParts.join(' · ') : isVendor ? '' : common

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
    shortIdLine: passport.shortId,
    vendorName: isVendor ? resolveVendorDisplayName(vendorProfile) : null,
    verifiedOrigin: isVendor ? Boolean(verifiedOrigin) : false,
  }
}

/** @param {import('i18next').TFunction} t */
export function buildBatchPassportItems(passports, batch, opts) {
  return (passports || []).map((passport) => buildPassportLabelItem({ passport, batch, ...opts }))
}
