import api from './api'
import publicApi from './publicApi'

/** GET públicos: Bearer opcional (myChoice si hay sesión). */
const sexIdCaseService = {
  getPublic: (caseId) => publicApi.get(`/public/sex-id-cases/${caseId}`).then((r) => r.data),

  listPublic: (page = 0, size = 20) =>
    publicApi.get('/public/sex-id-cases', { params: { page, size } }).then((r) => r.data),

  create: (payload) => api.post('/sex-id-cases', payload).then((r) => r.data),

  mine: (page = 0, size = 20) =>
    api.get('/sex-id-cases/mine', { params: { page, size } }).then((r) => r.data),

  vote: (caseId, choice) =>
    api.post(`/sex-id-cases/${caseId}/vote`, { choice }).then((r) => r.data),
}

export default sexIdCaseService
