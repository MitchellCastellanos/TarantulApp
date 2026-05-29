import api from './api'

export default {
  status: () => api.get('/me/origin-verification').then((r) => r.data),
  submit: (body) => api.post('/me/origin-verification', body).then((r) => r.data),
}
