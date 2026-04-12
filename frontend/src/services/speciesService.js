import api from './api'

const speciesService = {
  getAll: () => api.get('/species').then(r => r.data),
  getById: (id) => api.get(`/species/${id}`).then(r => r.data),
  search: (q) => api.get('/species', { params: { q } }).then(r => r.data),
}

export default speciesService
