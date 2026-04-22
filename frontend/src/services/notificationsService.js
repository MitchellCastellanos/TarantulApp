import api from './api'

const notificationsService = {
  list: (page = 0, size = 12) =>
    api.get('/notifications', { params: { page, size } }).then((r) => r.data),
  unreadCount: () =>
    api.get('/notifications/unread-count').then((r) => r.data?.count || 0),
  markRead: (notificationId) =>
    api.post(`/notifications/${notificationId}/read`).then((r) => r.data),
  markAllRead: () =>
    api.post('/notifications/read-all').then((r) => r.data),
}

export default notificationsService
