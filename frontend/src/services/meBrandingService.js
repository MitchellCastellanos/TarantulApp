import api from './api'

export default {
  get: () => api.get('/me/branding').then((r) => r.data),
  uploadLogo: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api
      .post('/me/branding/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data)
  },
  setPreferences: (body) => api.patch('/me/branding', body).then((r) => r.data),
  deleteLogo: () => api.delete('/me/branding/logo').then((r) => r.data),
}
