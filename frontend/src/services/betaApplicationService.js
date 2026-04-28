import publicApi from './publicApi'

const betaApplicationService = {
  create: (payload) =>
    publicApi.post('public/beta-applications', payload, { timeout: 15000 }).then((r) => r.data),
}

export default betaApplicationService
