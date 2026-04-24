import publicApi from './publicApi'

const moderationService = {
  reportPublicTarantula: (shortId, payload) =>
    publicApi.post(`/public/reports/tarantula/${shortId}`, payload).then((r) => r.data),
  reportMarketplaceListing: (listingId, payload) =>
    publicApi.post(`/public/reports/marketplace/${listingId}`, payload).then((r) => r.data),
  reportKeeperProfile: (keeperUserId, payload) =>
    publicApi.post(`/public/reports/keeper/${keeperUserId}`, payload).then((r) => r.data),
  reportMarketplaceChat: (threadId, payload) =>
    publicApi.post(`/public/reports/marketplace-chat/${threadId}`, payload).then((r) => r.data),
  reportActivityPost: (postId, payload) =>
    publicApi.post(`/public/reports/activity-post/${postId}`, payload).then((r) => r.data),
}

export default moderationService
