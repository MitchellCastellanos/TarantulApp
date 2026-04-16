import api from './api'

const billingService = {
  me: () => api.get('/billing/me').then(r => r.data),
  createCheckoutSession: (interval) => api.post('/billing/checkout', { interval }).then(r => r.data),
}

export default billingService
