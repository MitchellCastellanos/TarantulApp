const FORM_TYPES = new Set(['feeding', 'cleaning', 'checkup', 'custom'])

/**
 * Abre /reminders con formulario (opcional) y ejemplar preseleccionado.
 * @param {string} tarantulaId
 * @param {string} [type]
 * @param {{ openForm?: boolean }} [opts]
 */
export function remindersPrefillUrl(tarantulaId, type = 'feeding', opts = {}) {
  const openForm = opts.openForm !== false
  let t = String(type || 'feeding').toLowerCase()
  if (t === 'feeding_auto') t = 'feeding'
  if (!FORM_TYPES.has(t)) t = 'feeding'
  const q = new URLSearchParams()
  q.set('tarantulaId', String(tarantulaId))
  if (openForm) q.set('open', '1')
  q.set('type', t)
  return `/reminders?${q.toString()}`
}
