/**
 * Extra timeline/share lines for molt events (complication, duration).
 * @param {{ type?: string, successful?: boolean, complicationType?: string, durationMinutes?: unknown }} event
 * @param {(key: string, opts?: object) => string} t
 * @returns {string[]}
 */
export function moltEventDetailStrings(event, t) {
  if (event?.type !== 'molt') return []
  const out = []
  if (event.successful === false) {
    out.push(
      event.complicationType
        ? t(`molt.complication_${event.complicationType}`)
        : t('molt.hadComplication'),
    )
  }
  const mins = Number(event.durationMinutes)
  if (Number.isFinite(mins) && mins > 0) {
    out.push(`${mins} min`)
  }
  return out
}
