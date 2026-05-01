import api from './api'

const authService = {
  changePassword: (payload) => api.post('/auth/change-password', payload).then(r => r.data),
  acceptBetaAgreement: (accepted = true) =>
    api.post('/auth/beta-agreement', { accepted }).then((r) => r.data),
  oauthGoogle: (idToken, referralCode) =>
    api.post('/auth/oauth/google', { idToken, referralCode: referralCode || undefined }).then((r) => r.data),
}

export default authService
