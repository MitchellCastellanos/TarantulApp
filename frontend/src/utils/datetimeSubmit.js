/**
 * Converts a value from <input type="datetime-local"> (local wall time, no TZ)
 * to an RFC 3339 string with numeric offset so the backend stores the correct instant.
 */
export function datetimeLocalToOffsetISO(datetimeLocalValue) {
  if (!datetimeLocalValue || typeof datetimeLocalValue !== 'string') return null
  const normalized = datetimeLocalValue.length === 16 ? `${datetimeLocalValue}:00` : datetimeLocalValue
  const d = new Date(normalized)
  if (Number.isNaN(d.getTime())) return null
  const pad = (n) => String(n).padStart(2, '0')
  const y = d.getFullYear()
  const mo = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const h = pad(d.getHours())
  const mi = pad(d.getMinutes())
  const s = pad(d.getSeconds())
  const offMin = -d.getTimezoneOffset()
  const sign = offMin >= 0 ? '+' : '-'
  const abs = Math.abs(offMin)
  const oh = pad(Math.floor(abs / 60))
  const om = pad(abs % 60)
  return `${y}-${mo}-${day}T${h}:${mi}:${s}${sign}${oh}:${om}`
}

/** Current local date/time as datetime-local value (for form defaults). */
export function nowLocalDatetimeInputValue() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
