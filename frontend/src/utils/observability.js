import * as Sentry from '@sentry/react'

/**
 * Initializes Sentry when VITE_SENTRY_DSN is set at build time. No-op otherwise —
 * avoids shipping a real DSN in previews and keeps local dev noise-free.
 * Sample rates stay low by default so the free tier quota doesn't evaporate on launch day.
 */
export function initObservability() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return

  const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE || 'production'
  const release = import.meta.env.VITE_SENTRY_RELEASE || undefined
  const tracesSampleRate = parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0')
  const replaysSessionSampleRate = parseFloat(import.meta.env.VITE_SENTRY_REPLAY_SESSION_RATE || '0')
  const replaysOnErrorSampleRate = parseFloat(import.meta.env.VITE_SENTRY_REPLAY_ERROR_RATE || '0')

  Sentry.init({
    dsn,
    environment,
    release,
    tracesSampleRate: isFinite(tracesSampleRate) ? tracesSampleRate : 0,
    replaysSessionSampleRate: isFinite(replaysSessionSampleRate) ? replaysSessionSampleRate : 0,
    replaysOnErrorSampleRate: isFinite(replaysOnErrorSampleRate) ? replaysOnErrorSampleRate : 0,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()]
  })
}

/**
 * Links the currently signed-in user to Sentry scope so events carry the user id/email.
 * Passing a falsy value clears the user (call on logout).
 */
export function setObservabilityUser(user) {
  if (!import.meta.env.VITE_SENTRY_DSN) return
  if (!user) {
    Sentry.setUser(null)
    return
  }
  Sentry.setUser({
    id: user.id != null ? String(user.id) : undefined,
    email: user.email || undefined,
    username: user.username || undefined
  })
}

export { Sentry }
