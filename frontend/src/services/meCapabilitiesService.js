import api from './api'

const meCapabilitiesService = {
  get: () => api.get('/me/capabilities').then(r => r.data),
  activateStudio: () => api.post('/me/studio/activate').then(r => r.data),
  acceptBatchTerms: () => api.post('/me/batch-issuer-terms/accept').then(r => r.data),
}

export default meCapabilitiesService
