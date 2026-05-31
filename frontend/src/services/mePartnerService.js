import api from './api'

export default {
  hub: () => api.get('/me/partner/hub').then((r) => r.data),
  setCheckoutMode: (mode) => api.put('/me/partner/checkout-mode', { mode }).then((r) => r.data),
}
