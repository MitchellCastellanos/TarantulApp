import api from './api'

/** Fired so the Navbar (and similar) refreshes unread count without waiting for polling. */
export function notifyNotificationsUpdated() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('ta-notifications-updated'))
}

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
