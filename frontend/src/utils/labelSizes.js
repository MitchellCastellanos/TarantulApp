/** Presets for Label Studio bulk print (physical label width in cm). */
export const LABEL_SIZE_PRESETS = {
  tiny: { id: 'tiny', cm: 2, columns: 4 },
  small: { id: 'small', cm: 2.8, columns: 3 },
  medium: { id: 'medium', cm: 4, columns: 2 },
  large: { id: 'large', cm: 5, columns: 2 },
}

export const DEFAULT_LABEL_SIZE_ID = 'medium'

/** Co-branded vendor-passport labels: fixed physical width × height (cm). */
export const VENDOR_LABEL_SIZE_PRESETS = {
  vial: { id: 'vial', widthCm: 2.5, heightCm: 3.5, columns: 4, tier: 'vial' },
  small: { id: 'small', widthCm: 3.5, heightCm: 2.5, columns: 3, tier: 'small' },
  medium: { id: 'medium', widthCm: 5, heightCm: 3.5, columns: 2, tier: 'medium' },
  large: { id: 'large', widthCm: 7, heightCm: 5, columns: 2, tier: 'large' },
}

export const DEFAULT_VENDOR_LABEL_SIZE_ID = 'medium'

export const LABEL_SIZE_IDS = Object.keys(LABEL_SIZE_PRESETS)
export const VENDOR_LABEL_SIZE_IDS = Object.keys(VENDOR_LABEL_SIZE_PRESETS)

/** @param {string} [id] */
export function resolveLabelSizePreset(id) {
  const key = String(id || DEFAULT_LABEL_SIZE_ID).toLowerCase()
  return LABEL_SIZE_PRESETS[key] || LABEL_SIZE_PRESETS[DEFAULT_LABEL_SIZE_ID]
}

/** @param {string} [id] */
export function resolveVendorLabelSizePreset(id) {
  const key = String(id || DEFAULT_VENDOR_LABEL_SIZE_ID).toLowerCase()
  return VENDOR_LABEL_SIZE_PRESETS[key] || VENDOR_LABEL_SIZE_PRESETS[DEFAULT_VENDOR_LABEL_SIZE_ID]
}

/**
 * Resolve preset for PDF export. Vendor-passport uses physical W×H; legacy modes use QR-width presets.
 * @param {string} [sizeId]
 * @param {'simple'|'care'|'vendor-passport'|null} [layoutMode]
 */
export function resolveLabelExportPreset(sizeId, layoutMode = null) {
  if (layoutMode === 'vendor-passport') {
    return { ...resolveVendorLabelSizePreset(sizeId), mode: 'vendor-passport' }
  }
  return { ...resolveLabelSizePreset(sizeId), mode: 'legacy-qr' }
}

/** Convert cm to PDF points (72 pt / inch, 2.54 cm / inch). */
export function cmToPdfPt(cm) {
  return (Number(cm) * 72) / 2.54
}

/** Convert cm to canvas logical pixels (96 dpi). */
export function cmToCanvasPx(cm) {
  return Math.max(1, Math.round((Number(cm) * 96) / 2.54))
}

/** @param {{ widthCm: number, heightCm: number }} preset */
export function vendorLabelCanvasPx(preset) {
  return {
    widthPx: cmToCanvasPx(preset.widthCm),
    heightPx: cmToCanvasPx(preset.heightCm),
  }
}
