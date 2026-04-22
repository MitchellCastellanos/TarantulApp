import api from './api'
import publicApi from './publicApi'

const marketplaceService = {
  listPublic: (params = {}) => publicApi.get('/public/marketplace/listings', { params }).then((r) => r.data),
  getListingBoostOffer: () => publicApi.get('/public/marketplace/listing-boost-offer').then((r) => r.data),
  listOfficialVendors: (params = {}) => publicApi.get('/public/marketplace/official-vendors', { params }).then((r) => r.data),
  submitOfficialVendorLead: (payload) => publicApi.post('/public/marketplace/official-vendors/lead', payload).then((r) => r.data),
  listMine: () => api.get('/marketplace/listings/me').then((r) => r.data),
  createListing: (payload) => api.post('/marketplace/listings', payload).then((r) => r.data),
  updateListingStatus: (id, status) =>
    api.patch(`/marketplace/listings/${id}/status`, { status }).then((r) => r.data),

  getMyProfile: () => api.get('/marketplace/keeper-profile').then((r) => r.data),
  saveMyProfile: (payload) => api.put('/marketplace/keeper-profile', payload).then((r) => r.data),
  registerQrPrint: () => api.post('/marketplace/engagement/qr-print').then((r) => r.data),
  uploadProfilePhoto: (file) => {
    const form = new FormData()
    form.append('file', file, file.name || 'keeper-profile.jpg')
    return api.post('/marketplace/keeper-profile/photo', form).then((r) => r.data)
  },
  uploadListingImage: (file) => {
    const form = new FormData()
    form.append('file', file, file.name || 'listing.jpg')
    return api.post('/marketplace/listings/photo', form).then((r) => r.data)
  },

  getKeeperPublic: (sellerUserId) => publicApi.get(`/public/marketplace/keepers/${sellerUserId}`).then((r) => r.data),
  getKeeperReviews: (sellerUserId) => publicApi.get(`/public/marketplace/keepers/${sellerUserId}/reviews`).then((r) => r.data),
  addReview: (sellerUserId, payload) => api.post(`/marketplace/sellers/${sellerUserId}/reviews`, payload).then((r) => r.data),
}

export default marketplaceService
