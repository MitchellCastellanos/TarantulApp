import api from './api'

export default {
  hub: () => api.get('/me/partner/hub').then((r) => r.data),
}
