import api from './api'

const billingService = {
  // skipAuthRedirect: el 401 se maneja en AuthContext (logout silencioso) para no redirigir en /login con JWT viejo en localStorage.
  me: () => api.get('/billing/me', { skipAuthRedirect: true }).then(r => r.data),
  createCheckoutSession: (interval, region, tier = 'pro') =>
    api.post('/billing/checkout', { interval, region: region || 'INT', tier }).then(r => r.data),
  verifySession: (sessionId) => api.post('/billing/verify-session', { sessionId }).then(r => r.data),
  verifyGooglePlayPurchase: ({ purchaseToken, productId }) =>
    api.post('/billing/google-play/verify', { purchaseToken, productId }).then(r => r.data),
  createPortalSession: () => api.post('/billing/portal').then(r => r.data),
  requestVendorInvite: (locale) =>
    api.post('/billing/vendor-invite/request', locale ? { locale } : {}).then((r) => r.data),
  activateVendorMxStarter: (region) =>
    api.post('/billing/vendor/activate-starter', region ? { region } : {}).then((r) => r.data),
  vendorMxTier: () => api.get('/billing/vendor-mx-tier').then((r) => r.data),
  proGrantsSummary: () => api.get('/me/pro-grants/summary', { skipAuthRedirect: true }).then(r => r.data),
}

export default billingService
