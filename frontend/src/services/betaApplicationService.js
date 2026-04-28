import publicApi from './publicApi'

const betaApplicationService = {
  create: (payload) => publicApi.post('/public/beta-applications', payload).then((r) => r.data),
}

export default betaApplicationService
