import api from './api'

const authService = {
  changePassword: (payload) => api.post('/auth/change-password', payload).then(r => r.data),
  oauthGoogle: (idToken) => api.post('/auth/oauth/google', { idToken }).then(r => r.data),
}

export default authService
