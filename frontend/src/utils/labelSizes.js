/** Presets for Label Studio bulk print (physical label width in cm). */
export const LABEL_SIZE_PRESETS = {
  tiny: { id: 'tiny', cm: 2, columns: 4 },
  small: { id: 'small', cm: 2.8, columns: 3 },
  medium: { id: 'medium', cm: 4, columns: 2 },
  large: { id: 'large', cm: 5, columns: 2 },
}

export const DEFAULT_LABEL_SIZE_ID = 'medium'

/** @param {string} [id] */
export function resolveLabelSizePreset(id) {
  const key = String(id || DEFAULT_LABEL_SIZE_ID).toLowerCase()
  return LABEL_SIZE_PRESETS[key] || LABEL_SIZE_PRESETS[DEFAULT_LABEL_SIZE_ID]
}

/** Convert cm to PDF points (72 pt / inch, 2.54 cm / inch). */
export function cmToPdfPt(cm) {
  return (Number(cm) * 72) / 2.54
}

export const LABEL_SIZE_IDS = Object.keys(LABEL_SIZE_PRESETS)
