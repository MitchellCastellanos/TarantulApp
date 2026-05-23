import api from './api'

const tarantulaService = {
  getAll: () => api.get('/tarantulas').then(r => r.data),
  /** Paginated collection; backend returns `{ content, totalElements, page, size, hasNext }`. */
  getPage: (page = 0, size = 24) =>
    api.get('/tarantulas', { params: { page, size } }).then(r => r.data),
  getById: (id) => api.get(`/tarantulas/${id}`).then(r => r.data),
  create: (data) => api.post('/tarantulas', data).then(r => r.data),
  update: (id, data) => api.put(`/tarantulas/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/tarantulas/${id}`),
  togglePublic: (id) => api.patch(`/tarantulas/${id}/visibility`).then(r => r.data),
  bulkSetVisibility: (isPublic) =>
    api.patch('/tarantulas/bulk-visibility', { isPublic }).then((r) => r.data),
  markDeceased: (id, data) => api.patch(`/tarantulas/${id}/deceased`, data).then(r => r.data),
  getTimeline: (id) => api.get(`/tarantulas/${id}/timeline`).then(r => r.data),
  /** Paginado: `{ content, totalElements, page, size, hasNext }` */
  getTimelinePage: (id, page = 0, size = 40) =>
    api.get(`/tarantulas/${id}/timeline`, { params: { page, size } }).then(r => r.data),
  uploadPhoto: (id, file) => {
    const form = new FormData()
    // file puede ser un File original o un Blob recortado; le damos nombre explícito
    form.append('file', file, file.name || 'profile.jpg')
    // Sin Content-Type manual: axios añade multipart/form-data + boundary (obligatorio para Tomcat).
    return api.post(`/tarantulas/${id}/photo`, form).then(r => r.data)
  },
  getPhotos: (id) => api.get(`/tarantulas/${id}/photos`).then(r => r.data),
  getPhotosPage: (id, page = 0, size = 24) =>
    api.get(`/tarantulas/${id}/photos`, { params: { page, size } }).then(r => r.data),
  addPhoto: (id, file, caption) => {
    const form = new FormData()
    form.append('file', file)
    if (caption) form.append('caption', caption)
    return api.post(`/tarantulas/${id}/photos`, form).then(r => r.data)
  },
  deletePhoto: (tarantulaId, photoId) =>
    api.delete(`/tarantulas/${tarantulaId}/photos/${photoId}`),
}

export default tarantulaService
