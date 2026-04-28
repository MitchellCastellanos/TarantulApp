import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import adminService from '../services/adminService'

export default function AdminPage() {
  const { t } = useTranslation()
  const [summary, setSummary] = useState(null)
  const [recentUsers, setRecentUsers] = useState([])
  const [reports, setReports] = useState([])
  const [officialVendors, setOfficialVendors] = useState([])
  const [officialLeads, setOfficialLeads] = useState([])
  const [bugReports, setBugReports] = useState([])
  const [betaTesters, setBetaTesters] = useState([])
  const [betaApplications, setBetaApplications] = useState([])
  const [error, setError] = useState('')
  const [partnerSyncLoading, setPartnerSyncLoading] = useState(false)
  const [partnerSyncMessage, setPartnerSyncMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      adminService.summary(),
      adminService.recentUsers(),
      adminService.reports('open'),
      adminService.officialVendors(),
      adminService.officialVendorLeads(),
      adminService.bugReports('open'),
      adminService.betaTesters(),
      adminService.betaApplications('pending'),
    ])
      .then(([s, users, openReports, vendors, leads, bugs, testers, applications]) => {
        if (cancelled) return
        setSummary(s)
        setRecentUsers(Array.isArray(users) ? users : [])
        setReports(Array.isArray(openReports) ? openReports : [])
        setOfficialVendors(Array.isArray(vendors) ? vendors : [])
        setOfficialLeads(Array.isArray(leads) ? leads : [])
        setBugReports(Array.isArray(bugs) ? bugs : [])
        setBetaTesters(Array.isArray(testers) ? testers : [])
        setBetaApplications(Array.isArray(applications) ? applications : [])
      })
      .catch((err) => {
        if (cancelled) return
        const code = err?.response?.status
        setError(code === 403 ? t('admin.onlyAdmins') : t('admin.loadError'))
      })
    return () => {
      cancelled = true
    }
  }, [t])

  const resolveReport = async (id, action) => {
    try {
      await adminService.resolveReport(id, action, '')
      setReports((prev) => prev.filter((r) => r.id !== id))
    } catch {
      setError(t('admin.resolveError'))
    }
  }

  const patchBugReport = async (id, status) => {
    try {
      const updated = await adminService.patchBugReport(id, { status })
      setBugReports((prev) => prev.map((b) => (b.id === id ? updated : b)))
    } catch {
      setError(t('admin.resolveError'))
    }
  }

  const toggleBetaTester = async (id, nextValue) => {
    try {
      const updated = await adminService.patchUserBeta(id, { isBetaTester: nextValue })
      if (!nextValue) {
        setBetaTesters((prev) => prev.filter((u) => String(u.id) !== String(id)))
        return
      }
      setBetaTesters((prev) => prev.map((u) => (String(u.id) === String(id) ? updated : u)))
    } catch {
      setError(t('admin.resolveError'))
    }
  }

  const reviewApplication = async (id, action) => {
    try {
      const updated = await adminService.reviewBetaApplication(id, { action })
      setBetaApplications((prev) => prev.map((a) => (a.id === id ? updated : a)))
      if (action === 'approve') {
        const refreshed = await adminService.betaTesters()
        setBetaTesters(Array.isArray(refreshed) ? refreshed : [])
      }
    } catch {
      setError(t('admin.resolveError'))
    }
  }

  const toggleRecentUserTester = async (u) => {
    try {
      const nextValue = !(u?.isBetaTester === true)
      await adminService.patchUserBeta(u.id, { isBetaTester: nextValue })
      setRecentUsers((prev) =>
        prev.map((row) => (String(row.id) === String(u.id) ? { ...row, isBetaTester: nextValue } : row)),
      )
      const refreshed = await adminService.betaTesters()
      setBetaTesters(Array.isArray(refreshed) ? refreshed : [])
    } catch {
      setError(t('admin.resolveError'))
    }
  }

  const hideActionForReport = (report) => {
    if (report?.targetType === 'marketplace_listing') return 'hide_listing'
    if (report?.targetType === 'activity_post') return 'hide_activity_post'
    if (report?.targetType === 'keeper_profile') return 'hide_keeper_profile'
    return 'hide_tarantula'
  }

  const toggleOfficialVendor = async (vendorId, nextEnabled) => {
    try {
      const updated = await adminService.setOfficialVendorStatus(vendorId, nextEnabled)
      setOfficialVendors((prev) => prev.map((v) => (v.id === vendorId ? updated : v)))
    } catch {
      setError(t('admin.resolveError'))
    }
  }

  const patchVendorStrategic = async (vendorId, body) => {
    try {
      const updated = await adminService.updateOfficialVendorStrategicProgram(vendorId, body)
      setOfficialVendors((prev) => prev.map((v) => (String(v.id) === String(vendorId) ? updated : v)))
    } catch {
      setError(t('admin.resolveError'))
    }
  }

  const runPartnerSyncNow = async () => {
    setPartnerSyncLoading(true)
    setPartnerSyncMessage('')
    setError('')
    try {
      const runs = await adminService.runPartnerSync()
      const n = Array.isArray(runs) ? runs.length : 0
      setPartnerSyncMessage(t('admin.partnerSyncDone', { count: n }))
    } catch {
      setError(t('admin.partnerSyncError'))
    } finally {
      setPartnerSyncLoading(false)
    }
  }

  return (
    <div>
      <Navbar />
      <div className="container mt-4 mb-5" style={{ maxWidth: 980 }}>
        <h1 className="h4 mb-3">{t('admin.title')}</h1>
        {error && <div className="alert alert-danger">{error}</div>}
        {partnerSyncMessage && <div className="alert alert-success small py-2">{partnerSyncMessage}</div>}

        {summary && (
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-3"><div className="card p-3"><small className="text-muted">{t('admin.usersTotal')}</small><div className="h5 mb-0">{summary.usersTotal}</div></div></div>
            <div className="col-6 col-md-3"><div className="card p-3"><small className="text-muted">{t('admin.users7d')}</small><div className="h5 mb-0">{summary.usersLast7d}</div></div></div>
            <div className="col-6 col-md-3"><div className="card p-3"><small className="text-muted">{t('admin.tarantulas')}</small><div className="h5 mb-0">{summary.tarantulasTotal}</div></div></div>
            <div className="col-6 col-md-3"><div className="card p-3"><small className="text-muted">{t('admin.pendingReminders')}</small><div className="h5 mb-0">{summary.remindersPending}</div></div></div>
          </div>
        )}

        <div className="card p-3">
          <h2 className="h6 mb-3">{t('admin.recentUsers')}</h2>
          {recentUsers.length === 0 ? (
            <p className="text-muted small mb-0">{t('admin.noUsers')}</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>{t('auth.email')}</th>
                    <th>{t('auth.name')}</th>
                    <th>{t('admin.plan')}</th>
                    <th>{t('admin.created')}</th>
                    <th>{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((u) => (
                    <tr key={u.id}>
                      <td>{u.email}</td>
                      <td>{u.displayName || '-'}</td>
                      <td>{u.plan}</td>
                      <td>{u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</td>
                      <td>
                        <button
                          type="button"
                          className={`btn btn-sm ${u.isBetaTester ? 'btn-outline-danger' : 'btn-outline-success'}`}
                          onClick={() => toggleRecentUserTester(u)}
                        >
                          {u.isBetaTester ? t('admin.removeTester') : t('admin.makeTester')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-3 mt-3 border-warning">
          <h2 className="h6 mb-2">{t('admin.strategicPartnerSectionTitle')}</h2>
          <p className="small text-muted mb-3">{t('admin.strategicPartnerSectionBlurb')}</p>
          <button
            type="button"
            className="btn btn-sm btn-dark"
            disabled={partnerSyncLoading}
            onClick={() => runPartnerSyncNow()}
          >
            {partnerSyncLoading ? t('admin.partnerSyncRunning') : t('admin.runPartnerSync')}
          </button>
        </div>

        <div className="card p-3 mt-3">
          <h2 className="h6 mb-3">{t('admin.officialVendorsTitle')}</h2>
          {officialVendors.length === 0 ? (
            <p className="text-muted small mb-0">{t('admin.officialVendorsEmpty')}</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>{t('admin.officialVendorsColBrand')}</th>
                    <th>{t('admin.officialVendorsColLocation')}</th>
                    <th>{t('admin.officialVendorsColScore')}</th>
                    <th>{t('admin.officialVendorsColStatus')}</th>
                    <th className="text-center">{t('admin.officialVendorsColFounder')}</th>
                    <th className="text-center">{t('admin.officialVendorsColImport')}</th>
                    <th>{t('admin.officialVendorsColActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {officialVendors.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <div className="fw-semibold">{v.name}</div>
                        <div className="small text-muted">{v.websiteUrl}</div>
                      </td>
                      <td>{[v.city, v.state, v.country].filter(Boolean).join(' · ') || '-'}</td>
                      <td>{v.influenceScore ?? 0}</td>
                      <td>{v.enabled ? t('admin.officialVendorsActive') : t('admin.officialVendorsHidden')}</td>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          title="STRATEGIC_FOUNDER"
                          checked={v.partnerProgramTier === 'STRATEGIC_FOUNDER'}
                          onChange={(e) => patchVendorStrategic(v.id, { strategicFounder: e.target.checked })}
                        />
                      </td>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={!!v.listingImportEnabled}
                          onChange={(e) => patchVendorStrategic(v.id, { listingImportEnabled: e.target.checked })}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`btn btn-sm ${v.enabled ? 'btn-outline-danger' : 'btn-outline-success'}`}
                          onClick={() => toggleOfficialVendor(v.id, !v.enabled)}
                        >
                          {v.enabled ? t('admin.officialVendorsDeactivate') : t('admin.officialVendorsActivate')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-3 mt-3">
          <h2 className="h6 mb-3">{t('admin.officialLeadsTitle')}</h2>
          {officialLeads.length === 0 ? (
            <p className="text-muted small mb-0">{t('admin.officialLeadsEmpty')}</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Marca</th>
                    <th>Contacto</th>
                    <th>Cobertura</th>
                    <th>Notas</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {officialLeads.map((lead) => (
                    <tr key={lead.id}>
                      <td>
                        <div className="fw-semibold">{lead.businessName}</div>
                        <div className="small text-muted">{lead.websiteUrl || '-'}</div>
                      </td>
                      <td>
                        <div>{lead.contactName || '-'}</div>
                        <div className="small text-muted">{lead.contactEmail}</div>
                      </td>
                      <td>{[lead.city, lead.state, lead.country].filter(Boolean).join(' · ') || '-'}</td>
                      <td>{lead.note || '-'}</td>
                      <td>{lead.createdAt ? new Date(lead.createdAt).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-3 mt-3">
          <h2 className="h6 mb-3">{t('admin.betaBugReportsTitle')}</h2>
          {bugReports.length === 0 ? (
            <p className="text-muted small mb-0">{t('admin.betaBugReportsEmpty')}</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>{t('admin.created')}</th>
                    <th>{t('admin.severity')}</th>
                    <th>{t('admin.betaBugTitle')}</th>
                    <th>{t('admin.page')}</th>
                    <th>{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {bugReports.map((b) => (
                    <tr key={b.id}>
                      <td>{b.createdAt ? new Date(b.createdAt).toLocaleString() : '-'}</td>
                      <td>{b.severity || '-'}</td>
                      <td>{b.title || '-'}</td>
                      <td className="small text-muted">{b.currentUrl || '-'}</td>
                      <td className="d-flex flex-wrap gap-1">
                        <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => patchBugReport(b.id, 'in_progress')}>In progress</button>
                        <button type="button" className="btn btn-sm btn-outline-success" onClick={() => patchBugReport(b.id, 'fixed')}>Fixed</button>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => patchBugReport(b.id, 'wont_fix')}>Won't fix</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-3 mt-3">
          <h2 className="h6 mb-3">{t('admin.betaTestersTitle')}</h2>
          {betaTesters.length === 0 ? (
            <p className="text-muted small mb-0">{t('admin.betaTestersEmpty')}</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>{t('auth.email')}</th>
                    <th>{t('admin.country')}</th>
                    <th>{t('admin.level')}</th>
                    <th>{t('admin.betaBugReportsTitle')}</th>
                    <th>{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {betaTesters.map((u) => (
                    <tr key={u.id}>
                      <td>{u.email}</td>
                      <td>{u.betaCountry || '-'}</td>
                      <td>{u.betaExperienceLevel || '-'}</td>
                      <td>{u.bugReportsCount ?? 0}</td>
                      <td>
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => toggleBetaTester(u.id, false)}>
                          {t('admin.removeTester')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-3 mt-3">
          <h2 className="h6 mb-3">{t('admin.betaApplicationsTitle')}</h2>
          {betaApplications.length === 0 ? (
            <p className="text-muted small mb-0">{t('admin.betaApplicationsEmpty')}</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>{t('auth.email')}</th>
                    <th>{t('auth.name')}</th>
                    <th>{t('admin.country')}</th>
                    <th>{t('admin.level')}</th>
                    <th>{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {betaApplications.map((a) => (
                    <tr key={a.id}>
                      <td>{a.email}</td>
                      <td>{a.name || '-'}</td>
                      <td>{a.country || '-'}</td>
                      <td>{a.experienceLevel || '-'}</td>
                      <td className="d-flex gap-2">
                        <button type="button" className="btn btn-sm btn-outline-success" onClick={() => reviewApplication(a.id, 'approve')}>{t('admin.approve')}</button>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => reviewApplication(a.id, 'reject')}>{t('admin.reject')}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-3 mt-3">
          <h2 className="h6 mb-3">{t('admin.openReports')}</h2>
          {reports.length === 0 ? (
            <p className="text-muted small mb-0">{t('admin.noReports')}</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>{t('admin.target')}</th>
                    <th>{t('admin.targetType')}</th>
                    <th>{t('admin.reason')}</th>
                    <th>{t('admin.details')}</th>
                    <th>{t('admin.created')}</th>
                    <th>{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id}>
                      <td>{r.targetRef || r.targetId || '-'}</td>
                      <td className="text-muted small">{r.targetType || '-'}</td>
                      <td>{r.reason}</td>
                      <td>{r.details || '-'}</td>
                      <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</td>
                      <td className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => resolveReport(r.id, hideActionForReport(r))}
                        >
                          {t('admin.hidePublic')}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-light"
                          onClick={() => resolveReport(r.id, 'dismiss')}
                        >
                          {t('admin.dismiss')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
