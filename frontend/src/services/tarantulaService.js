import api from './api'

const tarantulaService = {
  getAll: () => api.get('/tarantulas').then(r => r.data),
  getById: (id) => api.get(`/tarantulas/${id}`).then(r => r.data),
  create: (data) => api.post('/tarantulas', data).then(r => r.data),
  update: (id, data) => api.put(`/tarantulas/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/tarantulas/${id}`),
  togglePublic: (id) => api.patch(`/tarantulas/${id}/visibility`).then(r => r.data),
  getTimeline: (id) => api.get(`/tarantulas/${id}/timeline`).then(r => r.data),
  uploadPhoto: (id, file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/tarantulas/${id}/photo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data)
  },
}

export default tarantulaService
