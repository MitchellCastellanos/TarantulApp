import api from './api'

const billingService = {
  me: () => api.get('/billing/me').then(r => r.data),
  createCheckoutSession: () => api.post('/billing/checkout').then(r => r.data),
}

export default billingService
