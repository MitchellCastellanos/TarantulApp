import api from './api'

const phoneService = {
  status: () => api.get('/me/phone').then(r => r.data),
  start: (phone) => api.post('/me/phone/verify/start', { phone }).then(r => r.data),
  check: (code) => api.post('/me/phone/verify/check', { code }).then(r => r.data),
}

export default phoneService
