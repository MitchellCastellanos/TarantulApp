import publicApi from './publicApi'

/** Same rules as backend {@code PublicHandleRules.normalize}. */
export function normalizePublicHandle(raw) {
  if (raw == null || typeof raw !== 'string') return ''
  let t = raw.trim()
  if (t.startsWith('@')) t = t.slice(1).trim()
  if (!t) return ''
  t = t.replace(/\s+/g, ' ').trim()
  if (!t) return ''
  t = t.toLowerCase().replace(/[^a-z0-9._-]/g, '')
  if (!t) return ''
  return t.length > 60 ? t.slice(0, 60) : t
}

const userPublicService = {
  /** @param {string} handle */
  byHandle: (handle) =>
    publicApi.get(`public/users/by-handle/${encodeURIComponent(handle.trim())}`).then((r) => r.data),

  /** @param {string} handle */
  checkHandleAvailability: (handle) =>
    publicApi.get('public/users/handle-availability', { params: { handle } }).then((r) => r.data),
}

export default userPublicService
