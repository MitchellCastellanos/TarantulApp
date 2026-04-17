import api from './api'

const billingService = {
  // skipAuthRedirect: el 401 se maneja en AuthContext (logout silencioso) para no redirigir en /login con JWT viejo en localStorage.
  me: () => api.get('/billing/me', { skipAuthRedirect: true }).then(r => r.data),
  createCheckoutSession: (interval) => api.post('/billing/checkout', { interval }).then(r => r.data),
  verifySession: (sessionId) => api.post('/billing/verify-session', { sessionId }).then(r => r.data),
}

export default billingService
