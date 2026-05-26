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
  sendOfficialVendorLeadOutreachEmail: (leadId, payload) =>
    api.post(`/admin/official-vendor-leads/${leadId}/send-outreach-email`, payload).then((r) => r.data),
  promoteOfficialVendorLead: (leadId, payload = {}) =>
    api.post(`/admin/official-vendor-leads/${leadId}/promote`, payload).then((r) => r.data),
  vendorVerifications: (status) =>
    api.get('/admin/vendor-verifications', { params: status ? { status } : {} }).then((r) => r.data),
  reviewVendorVerification: (id, payload) =>
    api.patch(`/admin/vendor-verifications/${id}`, payload).then((r) => r.data),
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
  setUserVerifiedBreeder: (id, verifiedBreeder) =>
    api.patch(`/admin/users/${id}/verified-breeder`, { verifiedBreeder }).then((r) => r.data),
  setUserStorefrontVerified: (id, storefrontVerified) =>
    api.patch(`/admin/users/${id}/storefront-verified`, { storefrontVerified }).then((r) => r.data),
  setVerifiedBreeder: (id, verifiedBreeder) =>
    api.patch(`/admin/users/${id}/verified-breeder`, { verifiedBreeder }).then((r) => r.data),
  marketplaceSellers: (params = {}) =>
    api.get('/admin/marketplace/sellers', { params }).then((r) => r.data),
  sendOfficialVendorPartnerCatalogEmail: (vendorId, payload) =>
    api.post(`/admin/official-vendors/${vendorId}/send-partner-catalog-email`, payload || {}).then((r) => r.data),
  sendOfficialVendorLeadPartnerCatalogEmail: (leadId, payload) =>
    api.post(`/admin/official-vendor-leads/${leadId}/send-partner-catalog-email`, payload || {}).then((r) => r.data),
  tapToContactRate: () =>
    api.get('/admin/marketing/tap-to-contact-rate').then((r) => r.data),
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
  listSpeciesTradeNotes: () => api.get('/admin/species-trade-notes').then((r) => r.data),
  upsertSpeciesTradeNote: (payload) => api.put('/admin/species-trade-notes', payload).then((r) => r.data),
  deleteSpeciesTradeNote: (id) => api.delete(`/admin/species-trade-notes/${id}`),
}

export default adminService
