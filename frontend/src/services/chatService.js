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
}

export default chatService
