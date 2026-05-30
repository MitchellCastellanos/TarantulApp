import { Capacitor } from '@capacitor/core'
import api from './api'
import { getTokenForApiRequest } from './authApiToken'

/**
 * Lightweight app usage analytics. One session id (per tab session, persisted in
 * sessionStorage) maps to one aggregated "visit" row server-side. Page views and
 * engaged time accumulate onto that row via the same endpoint.
 *
 * Privacy: we never send IPs; the backend resolves country/city from edge geo
 * headers or the IANA timezone we include here.
 */

const SESSION_KEY = 'ta_analytics_session'
const ENDPOINT_PATH = '/analytics/event'

function randomId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    /* ignore */
  }
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function getSessionId() {
  if (typeof window === 'undefined') return null
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = randomId()
      window.sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    // Storage blocked (private mode / strict settings) — fall back to an in-memory id.
    if (!getSessionId._fallback) getSessionId._fallback = randomId()
    return getSessionId._fallback
  }
}

function detectPlatform() {
  try {
    if (Capacitor && typeof Capacitor.getPlatform === 'function') {
      return Capacitor.getPlatform() // 'web' | 'android' | 'ios'
    }
  } catch {
    /* ignore */
  }
  return 'web'
}

function detectTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null
  } catch {
    return null
  }
}

function buildContext(path) {
  return {
    sessionId: getSessionId(),
    path: typeof path === 'string' ? path : (typeof window !== 'undefined' ? window.location.pathname : ''),
    referrer: typeof document !== 'undefined' ? document.referrer || '' : '',
    timezone: detectTimezone(),
    locale: typeof navigator !== 'undefined' ? navigator.language || '' : '',
    platform: detectPlatform(),
    appVersion: import.meta.env.VITE_APP_VERSION || import.meta.env.MODE || 'web',
  }
}

function absoluteEndpoint() {
  const base = String(api?.defaults?.baseURL || '').replace(/\/+$/, '')
  return `${base}${ENDPOINT_PATH}`
}

/** Best-effort send that survives page unload (keepalive fetch with auth header when available). */
function sendKeepalive(payload) {
  try {
    const headers = { 'Content-Type': 'application/json' }
    const token = getTokenForApiRequest()
    if (token) headers.Authorization = `Bearer ${token}`
    fetch(absoluteEndpoint(), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: 'omit',
    }).catch(() => {})
  } catch {
    /* ignore — analytics is best-effort */
  }
}

const analyticsService = {
  getSessionId,

  /** Records a page view (creates the visit row on first call). */
  trackPageView(path) {
    const payload = { ...buildContext(path), type: 'pageview', engagedSeconds: 0 }
    api.post(ENDPOINT_PATH, payload).catch(() => {})
  },

  /** Accumulates engaged seconds onto the current visit. Uses keepalive when unloading. */
  trackEngagement(engagedSeconds, { beacon = false } = {}) {
    const seconds = Math.max(0, Math.round(Number(engagedSeconds) || 0))
    if (seconds <= 0) return
    const payload = { ...buildContext(), type: 'heartbeat', engagedSeconds: seconds }
    if (beacon) {
      sendKeepalive(payload)
    } else {
      api.post(ENDPOINT_PATH, payload).catch(() => {})
    }
  },
}

export default analyticsService
