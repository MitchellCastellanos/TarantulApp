import api from './api'

export default {
  hub: () => api.get('/me/partner/hub').then((r) => r.data),
  setCheckoutMode: (mode) => api.put('/me/partner/checkout-mode', { mode }).then((r) => r.data),
  updateShippingProfile: (shippingProfile) =>
    api.put('/me/partner/shipping-profile', { shippingProfile }).then((r) => r.data),
  createFeatureRequest: (payload) =>
    api.post('/me/partner/feature-requests', payload).then((r) => r.data),
  orders: () => api.get('/me/partner/orders').then((r) => r.data),
  stripeConnectOnboard: () => api.post('/me/partner/stripe-connect/onboard').then((r) => r.data),
}
