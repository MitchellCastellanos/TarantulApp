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

  createOrderIntent: (threadId, { subtotalOverride = null, legalAccepted = false } = {}) =>
    api.post(`/chat/threads/${threadId}/order-intent`, {
      ...(subtotalOverride ? { subtotalOverride: String(subtotalOverride) } : {}),
      legalAccepted: !!legalAccepted,
    }).then((r) => r.data),

  getThreadOrder: (threadId) =>
    api.get(`/chat/threads/${threadId}/order`).then((r) => r.data),

  threadOrderEvents: (threadId) =>
    api.get(`/chat/threads/${threadId}/order/events`).then((r) => r.data),

  simulateOrderPayment: (threadId) =>
    api.post(`/chat/threads/${threadId}/order/simulate-payment`).then((r) => r.data),

  simulateOrderRelease: (threadId) =>
    api.post(`/chat/threads/${threadId}/order/simulate-release`).then((r) => r.data),

  reportOrderIssue: (threadId) =>
    api.post(`/chat/threads/${threadId}/order/report-issue`).then((r) => r.data),

  /** @deprecated Use reportOrderIssue */
  disputeOrder: (threadId) =>
    api.post(`/chat/threads/${threadId}/order/report-issue`).then((r) => r.data),

  reportOrderPayment: (threadId, paymentReference = '') =>
    api.post(`/chat/threads/${threadId}/order/report-payment`, { paymentReference }).then((r) => r.data),

  markOrderInTransit: (threadId) =>
    api.post(`/chat/threads/${threadId}/order/mark-in-transit`).then((r) => r.data),

  markOrderDelivered: (threadId) =>
    api.post(`/chat/threads/${threadId}/order/mark-delivered`).then((r) => r.data),

  closeOrder: (threadId) =>
    api.post(`/chat/threads/${threadId}/order/close`).then((r) => r.data),

  createOrderCheckout: (threadId) =>
    api.post(`/chat/threads/${threadId}/order/checkout`).then((r) => r.data),
}

export default chatService
