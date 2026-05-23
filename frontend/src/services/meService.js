import api from './api'

const meService = {
  getNewsletterSubscription: () => api.get('/me/newsletter-subscription').then((r) => r.data),
  setNewsletterSubscription: (subscribed) =>
    api.put('/me/newsletter-subscription', { subscribed }).then((r) => r.data),
}

export default meService
