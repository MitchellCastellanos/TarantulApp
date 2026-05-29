import api from './api'

const studioService = {
  listBatches: () => api.get('/studio/batches').then(r => r.data),
  getBatch: (batchId) => api.get(`/studio/batches/${batchId}`).then(r => r.data),
  createBatch: (body) => api.post('/studio/batches', body).then(r => r.data),
  adjustBatch: (batchId, body) => api.post(`/studio/batches/${batchId}/adjustments`, body).then(r => r.data),
  generatePassports: (batchId, body) => api.post(`/studio/batches/${batchId}/passports`, body).then(r => r.data),
  listPassports: (batchId) => api.get(`/studio/batches/${batchId}/passports`).then(r => r.data),
}

export default studioService
