import api from './api'

const chatService = {
  threads: (page = 0, size = 20) =>
    api.get('/chat/threads', { params: { page, size } }).then((r) => r.data),

  openThread: (otherUserId, listingId = null) =>
    api.post('/chat/threads/open', { otherUserId, listingId }).then((r) => r.data),

  messages: (threadId, page = 0, size = 40) =>
    api.get(`/chat/threads/${threadId}/messages`, { params: { page, size } }).then((r) => r.data),

  sendMessage: (threadId, body) =>
    api.post(`/chat/threads/${threadId}/messages`, { body }).then((r) => r.data),

  updateTransactionStatus: (threadId, status) =>
    api.post(`/chat/threads/${threadId}/transaction-status`, { status }).then((r) => r.data),

  threadEvents: (threadId) =>
    api.get(`/chat/threads/${threadId}/events`).then((r) => r.data),

  addThreadEvent: (threadId, payload) =>
    api.post(`/chat/threads/${threadId}/events`, payload).then((r) => r.data),

  uploadThreadEventEvidence: (threadId, file) => {
    const form = new FormData()
    form.append('file', file, file.name || 'evidence.jpg')
    return api.post(`/chat/threads/${threadId}/events/evidence`, form).then((r) => r.data)
  },

  threadPushDeliveries: (threadId) =>
    api.get(`/chat/threads/${threadId}/push-deliveries`).then((r) => r.data),
}

export default chatService
