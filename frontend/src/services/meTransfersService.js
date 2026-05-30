import api from './api'

export default {
  initiate: (body) => api.post('/me/transfers', body).then((r) => r.data),
  incoming: () => api.get('/me/transfers/incoming').then((r) => r.data),
  outgoing: () => api.get('/me/transfers/outgoing').then((r) => r.data),
  accept: (id) => api.post(`/me/transfers/${id}/accept`).then((r) => r.data),
  cancel: (id) => api.post(`/me/transfers/${id}/cancel`).then((r) => r.data),
}
