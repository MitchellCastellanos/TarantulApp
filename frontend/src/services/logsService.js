import api from './api'

const logsService = {
  // Feeding
  addFeeding: (tId, data) => api.post(`/tarantulas/${tId}/feedings`, data).then(r => r.data),
  getFeedings: (tId) => api.get(`/tarantulas/${tId}/feedings`).then(r => r.data),
  deleteFeeding: (id) => api.delete(`/feedings/${id}`),

  // Molt
  addMolt: (tId, data) => api.post(`/tarantulas/${tId}/molts`, data).then(r => r.data),
  getMolts: (tId) => api.get(`/tarantulas/${tId}/molts`).then(r => r.data),
  deleteMolt: (id) => api.delete(`/molts/${id}`),

  // Behavior
  addBehavior: (tId, data) => api.post(`/tarantulas/${tId}/behaviors`, data).then(r => r.data),
  getBehaviors: (tId) => api.get(`/tarantulas/${tId}/behaviors`).then(r => r.data),
  deleteBehavior: (id) => api.delete(`/behaviors/${id}`),
}

export default logsService
