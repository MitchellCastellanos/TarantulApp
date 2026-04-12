import api from './api'

const reminderService = {
  getAll: () => api.get('/reminders').then(r => r.data),
  getPending: () => api.get('/reminders/pending').then(r => r.data),
  create: (data) => api.post('/reminders', data).then(r => r.data),
  markDone: (id) => api.patch(`/reminders/${id}/done`).then(r => r.data),
  delete: (id) => api.delete(`/reminders/${id}`),
}

export default reminderService
