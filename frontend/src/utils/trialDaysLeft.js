/**
 * Días de prueba restantes alineados con fechas de calendario locales (no Math.ceil sobre ms,
 * que inflaba +1 cuando quedaba p.ej. "10 días y pocas horas" ? 11).
 * Si el fin cae hoy pero aún no ha pasado la hora, devuelve 1.
 */
export function trialCalendarDaysRemaining(iso) {
  if (iso == null || iso === '') return 0
  const end = new Date(iso)
  if (Number.isNaN(end.getTime())) return 0
  if (end.getTime() <= Date.now()) return 0

  const startOfLocalDay = (d) => {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x
  }

  const today = startOfLocalDay(new Date())
  const endDay = startOfLocalDay(end)
  const gapDays = Math.round((endDay.getTime() - today.getTime()) / 86400000)
  if (gapDays <= 0) return 1
  return gapDays
}
