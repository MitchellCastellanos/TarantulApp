import api from './api'

const adminService = {
  summary: () => api.get('/admin/summary').then((r) => r.data),
  recentUsers: (params = {}) =>
    api.get('/admin/recent-users', { params }).then((r) => {
      const d = r.data
      if (d && typeof d === 'object' && !Array.isArray(d) && Array.isArray(d.users)) {
        return {
          users: d.users,
          totalUsers: typeof d.totalUsers === 'number' ? d.totalUsers : 0,
          limit: typeof d.limit === 'number' ? d.limit : params.limit,
          sort: d.sort,
        }
      }
      if (Array.isArray(d)) {
        return { users: d, totalUsers: d.length, limit: d.length, sort: params.sort }
      }
      return { users: [], totalUsers: 0, limit: params.limit, sort: params.sort }
    }),
  reports: (status = 'open') => api.get('/admin/reports', { params: { status } }).then((r) => r.data),
  resolveReport: (id, action, note) =>
    api.patch(`/admin/reports/${id}/resolve`, { action, note }).then((r) => r.data),
  officialVendors: () => api.get('/admin/official-vendors').then((r) => r.data),
  officialVendorLeads: () => api.get('/admin/official-vendor-leads').then((r) => r.data),
  upsertOfficialVendorOutreachLead: (payload) =>
    api.post('/admin/official-vendor-leads/outreach', payload).then((r) => r.data),
  patchOfficialVendorLeadOutreach: (leadId, payload) =>
    api.patch(`/admin/official-vendor-leads/${leadId}/outreach`, payload).then((r) => r.data),
  probeWooCommerceForUrl: (websiteUrl) =>
    api.post('/admin/official-vendor-leads/probe-woocommerce', { websiteUrl }).then((r) => r.data),
  probeWooCommerceForLead: (leadId) =>
    api.post(`/admin/official-vendor-leads/${leadId}/probe-woocommerce`).then((r) => r.data),
  partnerReadinessReportForUrl: (websiteUrl, options = {}) => {
    const body = { websiteUrl }
    const trim = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null)
    const feedUrl = trim(options.feedUrl)
    const shopifyShopDomain = trim(options.shopifyShopDomain)
    const shopifyAccessToken = trim(options.shopifyAccessToken)
    const lightspeedApiKey = trim(options.lightspeedApiKey)
    const lightspeedApiSecret = trim(options.lightspeedApiSecret)
    const lightspeedLang = trim(options.lightspeedLang)
    if (feedUrl) body.feedUrl = feedUrl
    if (shopifyShopDomain) body.shopifyShopDomain = shopifyShopDomain
    if (shopifyAccessToken) body.shopifyAccessToken = shopifyAccessToken
    if (lightspeedApiKey) body.lightspeedApiKey = lightspeedApiKey
    if (lightspeedApiSecret) body.lightspeedApiSecret = lightspeedApiSecret
    if (lightspeedLang) body.lightspeedLang = lightspeedLang
    return api.post('/admin/official-vendor-leads/readiness-report', body).then((r) => r.data)
  },
  partnerReadinessReportForLead: (leadId) =>
    api.post(`/admin/official-vendor-leads/${leadId}/readiness-report`).then((r) => r.data),
  sendOfficialVendorLeadOutreachEmail: (leadId, payload) =>
    api.post(`/admin/official-vendor-leads/${leadId}/send-outreach-email`, payload).then((r) => r.data),
  promoteOfficialVendorLead: (leadId, payload = {}) =>
    api.post(`/admin/official-vendor-leads/${leadId}/promote`, payload).then((r) => r.data),
  createOfficialVendor: (payload) =>
    api.post('/admin/official-vendors', payload).then((r) => r.data),
  officialVendorBranding: (vendorId) =>
    api.get(`/admin/official-vendors/${vendorId}/branding`).then((r) => r.data),
  uploadOfficialVendorLogo: (vendorId, file) => {
    const form = new FormData()
    form.append('file', file)
    return api
      .post(`/admin/official-vendors/${vendorId}/logo`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data)
  },
  deleteOfficialVendorLogo: (vendorId) =>
    api.delete(`/admin/official-vendors/${vendorId}/logo`).then((r) => r.data),
  promoteUserToOfficialPartner: (userId, payload = {}) =>
    api.post(`/admin/users/${userId}/promote-official-partner`, payload).then((r) => r.data),
  vendorVerifications: (status) =>
    api.get('/admin/vendor-verifications', { params: status ? { status } : {} }).then((r) => r.data),
  reviewVendorVerification: (id, payload) =>
    api.patch(`/admin/vendor-verifications/${id}`, payload).then((r) => r.data),
  originVerifications: (status) =>
    api.get('/admin/origin-verifications', { params: status ? { status } : {} }).then((r) => r.data),
  reviewOriginVerification: (id, payload) =>
    api.patch(`/admin/origin-verifications/${id}`, payload).then((r) => r.data),
  setUserVerifiedOrigin: (id, verified, kind, options = {}) =>
    api.patch(`/admin/users/${id}/verified-origin`, { verified, kind, ...options }).then((r) => r.data),
  setOfficialVendorStatus: (id, enabled) =>
    api.patch(`/admin/official-vendors/${id}/status`, { enabled }).then((r) => r.data),
  updateOfficialVendorStrategicProgram: (id, payload) =>
    api.patch(`/admin/official-vendors/${id}/strategic-program`, payload).then((r) => r.data),
  runPartnerSync: () => api.post('/admin/partner-sync/run').then((r) => r.data),
  runPartnerSyncForVendor: (vendorId) =>
    api.post(`/admin/partner-sync/run/${vendorId}`).then((r) => r.data),
  partnerSyncRuns: (vendorId) =>
    api.get('/admin/partner-sync/runs', { params: vendorId ? { vendorId } : {} }).then((r) => r.data),
  partnerEcosystemClosureStatus: () =>
    api.get('/admin/partner-ecosystem/closure-status').then((r) => r.data),
  partnerDashboard: () => api.get('/admin/partners/dashboard').then((r) => r.data),
  bugReports: (status = '') =>
    api.get('/admin/bug-reports', { params: status ? { status } : {} }).then((r) => r.data),
  patchBugReport: (id, payload) =>
    api.patch(`/admin/bug-reports/${id}`, payload).then((r) => r.data),
  betaTesters: () =>
    api.get('/admin/beta-testers').then((r) => r.data),
  patchUserBeta: (id, payload) =>
    api.patch(`/admin/users/${id}/beta`, payload).then((r) => r.data),
  /** Adds user email to Play testing Google Group (admin). {@code force} clears local "synced" and calls Google again. */
  syncGoogleTestersGroup: (id, force = false) =>
    api
      .post(`/admin/users/${id}/google-testers-group-sync`, null, {
        params: { force: force ? 'true' : 'false' },
      })
      .then((r) => r.data),
  patchUserPlan: (id, payload) =>
    api.patch(`/admin/users/${id}/plan`, payload).then((r) => r.data),
  betaApplications: (status = '') =>
    api.get('/admin/beta-applications', { params: status ? { status } : {} }).then((r) => r.data),
  betaStats: () => api.get('/admin/beta-stats').then((r) => r.data),
  reviewBetaApplication: (id, payload) =>
    api.patch(`/admin/beta-applications/${id}/review`, payload).then((r) => r.data),
  setUserPassword: (id, payload) =>
    api.post(`/admin/users/${id}/password`, payload).then((r) => r.data),
  provisionTester: (payload) =>
    api.post('/admin/beta-testers/provision', payload).then((r) => r.data),
  sendBetaWelcomeEmail: (userId, payload) =>
    api.post(`/admin/users/${userId}/send-beta-welcome-email`, payload).then((r) => r.data),
  sendOutreachEmail: (userId, payload) =>
    api.post(`/admin/users/${userId}/send-outreach-email`, payload).then((r) => r.data),
  mailConfigStatus: () => api.get('/admin/mail/config-status').then((r) => r.data),
  mailTestSend: (to) => api.post('/admin/mail/test-send', { to }).then((r) => r.data),
  betaCampaignCatalog: () => api.get('/admin/beta-emails/campaign-catalog').then((r) => r.data),
  sendBetaCampaignBatch: (payload) =>
    api.post('/admin/beta-emails/send-campaign', payload).then((r) => r.data),
  vendorUsers: (limit = 100, includePendingInvites = true) =>
    api.get('/admin/vendor-users', { params: { limit, includePendingInvites } }).then((r) => r.data),
  sendVendorInvite: (id, locale) =>
    api.post(`/admin/users/${id}/vendor-invite`, locale ? { locale } : {}).then((r) => r.data),
  revokeVendorInvite: (id) => api.post(`/admin/users/${id}/vendor-invite/revoke`).then((r) => r.data),
  userLookupByEmail: (email) =>
    api.get('/admin/user-lookup', { params: { email } }).then((r) => r.data),
  setUserVerifiedBreeder: (id, verifiedBreeder, options = {}) =>
    api.patch(`/admin/users/${id}/verified-breeder`, { verifiedBreeder, ...options }).then((r) => r.data),
  setUserMarketingOps: (id, marketingOps) =>
    api.patch(`/admin/users/${id}/marketing-ops`, { marketingOps }).then((r) => r.data),
  provisionMarketingTeamMember: (payload) =>
    api.post('/admin/marketing/provision-team-member', payload).then((r) => r.data),
  setUserStorefrontVerified: (id, storefrontVerified, options = {}) =>
    api.patch(`/admin/users/${id}/storefront-verified`, { storefrontVerified, ...options }).then((r) => r.data),
  setVerifiedBreeder: (id, verifiedBreeder, options = {}) =>
    api.patch(`/admin/users/${id}/verified-breeder`, { verifiedBreeder, ...options }).then((r) => r.data),
  grantBoostCredits: (id, payload = {}) =>
    api.post(`/admin/users/${id}/boost-credits`, payload).then((r) => r.data),
  marketplaceSellers: (params = {}) =>
    api.get('/admin/marketplace/sellers', { params }).then((r) => r.data),
  sendOfficialVendorPartnerCatalogEmail: (vendorId, payload) =>
    api.post(`/admin/official-vendors/${vendorId}/send-partner-catalog-email`, payload || {}).then((r) => r.data),
  sendOfficialVendorLeadPartnerCatalogEmail: (leadId, payload) =>
    api.post(`/admin/official-vendor-leads/${leadId}/send-partner-catalog-email`, payload || {}).then((r) => r.data),
  tapToContactRate: () =>
    api.get('/admin/marketing/tap-to-contact-rate').then((r) => r.data),
  partnerListingEvents: () =>
    api.get('/admin/marketing/partner-listing-events').then((r) => r.data),
  listingCounts: () =>
    api.get('/admin/marketing/listing-counts').then((r) => r.data),
  newsletterSubscriberCount: () =>
    api.get('/admin/marketing/newsletter/subscribers/count').then((r) => r.data),
  createNewsletterDraft: (payload) =>
    api.post('/admin/marketing/newsletter/drafts', payload).then((r) => r.data),
  previewNewsletterDraft: (id) =>
    api.get(`/admin/marketing/newsletter/drafts/${id}`).then((r) => r.data),
  sendNewsletterDraft: (id) =>
    api.post(`/admin/marketing/newsletter/drafts/${id}/send`).then((r) => r.data),
  liveTopVendors: (limit = 3) =>
    api.get('/admin/marketing/top-vendors/live', { params: { limit } }).then((r) => r.data),
  topVendorHistory: (month) =>
    api.get('/admin/marketing/top-vendors/history', month ? { params: { month } } : {}).then((r) => r.data),
  adStudioListings: (params = {}) =>
    api.get('/admin/marketing/ad-studio/listings', { params }).then((r) => r.data),
  adStudioGenerate: (payload) =>
    api.post('/admin/marketing/ad-studio/generate', payload).then((r) => r.data),
  adStudioTemplates: () =>
    api.get('/admin/marketing/ad-studio/templates').then((r) => r.data),
  appAnalytics: (range = '30d') =>
    api.get('/admin/analytics', { params: { range } }).then((r) => r.data),
  listSpeciesTradeNotes: () => api.get('/admin/species-trade-notes').then((r) => r.data),
  upsertSpeciesTradeNote: (payload) => api.put('/admin/species-trade-notes', payload).then((r) => r.data),
  deleteSpeciesTradeNote: (id) => api.delete(`/admin/species-trade-notes/${id}`),
  userBranding: (userId) => api.get(`/admin/users/${userId}/branding`).then((r) => r.data),
  uploadUserLogo: (userId, file) => {
    const form = new FormData()
    form.append('file', file)
    return api
      .post(`/admin/users/${userId}/branding/logo`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },
  deleteUserLogo: (userId) => api.delete(`/admin/users/${userId}/branding/logo`).then((r) => r.data),
  createSpecies: (payload) => api.post('/admin/species', payload).then((r) => r.data),
  speciesGaps: () => api.get('/admin/species/gaps').then((r) => r.data),
  dismissSpeciesGap: (id) => api.post(`/admin/species/gaps/${id}/dismiss`).then((r) => r.data),
}

export default adminService
