import api from './api'

function detectViewport() {
  if (typeof window === 'undefined') return ''
  return `${window.innerWidth}x${window.innerHeight}`
}

const bugReportService = {
  create: ({ severity, title, description, expectedBehavior, screenshotUrl }) =>
    api.post('/bug-reports', {
      severity,
      title,
      description,
      expectedBehavior,
      screenshotUrl,
      currentUrl: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      viewport: detectViewport(),
      appVersion: import.meta.env.VITE_APP_VERSION || import.meta.env.MODE || 'web',
    }).then((r) => r.data),
}

export default bugReportService
