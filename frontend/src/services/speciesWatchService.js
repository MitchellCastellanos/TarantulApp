import api from './api'

const speciesWatchService = {
  listMine: () => api.get('/me/species-watches').then((r) => r.data),
  status: (speciesId) =>
    api.get('/me/species-watches/status', { params: { speciesId } }).then((r) => r.data),
  watch: (speciesId) => api.post('/me/species-watches', { speciesId }).then((r) => r.data),
  unwatch: (speciesId) => api.delete(`/me/species-watches/${speciesId}`).then((r) => r.data),
}

export default speciesWatchService
