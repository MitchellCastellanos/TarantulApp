import api from './api'

const tarantulaService = {
  getAll: () => api.get('/tarantulas').then(r => r.data),
  getById: (id) => api.get(`/tarantulas/${id}`).then(r => r.data),
  create: (data) => api.post('/tarantulas', data).then(r => r.data),
  update: (id, data) => api.put(`/tarantulas/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/tarantulas/${id}`),
  togglePublic: (id) => api.patch(`/tarantulas/${id}/visibility`).then(r => r.data),
  markDeceased: (id, data) => api.patch(`/tarantulas/${id}/deceased`, data).then(r => r.data),
  getTimeline: (id) => api.get(`/tarantulas/${id}/timeline`).then(r => r.data),
  uploadPhoto: (id, file) => {
    const form = new FormData()
    // file puede ser un File original o un Blob recortado; le damos nombre explícito
    form.append('file', file, file.name || 'profile.jpg')
    return api.post(`/tarantulas/${id}/photo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data)
  },
  getPhotos: (id) => api.get(`/tarantulas/${id}/photos`).then(r => r.data),
  addPhoto: (id, file, caption) => {
    const form = new FormData()
    form.append('file', file)
    if (caption) form.append('caption', caption)
    return api.post(`/tarantulas/${id}/photos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data)
  },
  deletePhoto: (tarantulaId, photoId) =>
    api.delete(`/tarantulas/${tarantulaId}/photos/${photoId}`),
}

export default tarantulaService
