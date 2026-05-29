import api from './api'

const passportService = {
  claim: (shortId, body = {}) =>
    api.post(`/public/t/${shortId}/claim`, body).then(r => r.data),
}

export default passportService
