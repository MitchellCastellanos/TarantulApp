import publicApi from './publicApi'

const moderationService = {
  reportPublicTarantula: (shortId, payload) =>
    publicApi.post(`/public/reports/tarantula/${shortId}`, payload).then((r) => r.data),
}

export default moderationService
