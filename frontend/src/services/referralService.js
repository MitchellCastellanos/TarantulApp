import api from './api'

const referralService = {
  me: () => api.get('/referrals/me').then((r) => r.data),
}

export default referralService
