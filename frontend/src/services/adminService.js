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
  setOfficialVendorStatus: (id, enabled) =>
    api.patch(`/admin/official-vendors/${id}/status`, { enabled }).then((r) => r.data),
  updateOfficialVendorStrategicProgram: (id, payload) =>
    api.patch(`/admin/official-vendors/${id}/strategic-program`, payload).then((r) => r.data),
  runPartnerSync: () => api.post('/admin/partner-sync/run').then((r) => r.data),
  partnerSyncRuns: (vendorId) =>
    api.get('/admin/partner-sync/runs', { params: vendorId ? { vendorId } : {} }).then((r) => r.data),
  bugReports: (status = '') =>
    api.get('/admin/bug-reports', { params: status ? { status } : {} }).then((r) => r.data),
  patchBugReport: (id, payload) =>
    api.patch(`/admin/bug-reports/${id}`, payload).then((r) => r.data),
  betaTesters: () =>
    api.get('/admin/beta-testers').then((r) => r.data),
  patchUserBeta: (id, payload) =>
    api.patch(`/admin/users/${id}/beta`, payload).then((r) => r.data),
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
  mailConfigStatus: () => api.get('/admin/mail/config-status').then((r) => r.data),
  mailTestSend: (to) => api.post('/admin/mail/test-send', { to }).then((r) => r.data),
  betaCampaignCatalog: () => api.get('/admin/beta-emails/campaign-catalog').then((r) => r.data),
  sendBetaCampaignBatch: (payload) =>
    api.post('/admin/beta-emails/send-campaign', payload).then((r) => r.data),
}

export default adminService
