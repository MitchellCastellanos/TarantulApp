import api from './api'

export default {
  getCollection: () => api.get('/insights/collection').then((r) => r.data),
}
