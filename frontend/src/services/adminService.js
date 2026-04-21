import api from './api'

const adminService = {
  summary: () => api.get('/admin/summary').then((r) => r.data),
  recentUsers: () => api.get('/admin/recent-users').then((r) => r.data),
  reports: (status = 'open') => api.get('/admin/reports', { params: { status } }).then((r) => r.data),
  resolveReport: (id, action, note) =>
    api.patch(`/admin/reports/${id}/resolve`, { action, note }).then((r) => r.data),
  officialVendors: () => api.get('/admin/official-vendors').then((r) => r.data),
  officialVendorLeads: () => api.get('/admin/official-vendor-leads').then((r) => r.data),
  setOfficialVendorStatus: (id, enabled) =>
    api.patch(`/admin/official-vendors/${id}/status`, { enabled }).then((r) => r.data),
}

export default adminService
