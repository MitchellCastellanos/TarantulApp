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
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      adminService.summary(),
      adminService.recentUsers(),
      adminService.reports('open'),
      adminService.officialVendors(),
      adminService.officialVendorLeads(),
    ])
      .then(([s, users, openReports, vendors, leads]) => {
        if (cancelled) return
        setSummary(s)
        setRecentUsers(Array.isArray(users) ? users : [])
        setReports(Array.isArray(openReports) ? openReports : [])
        setOfficialVendors(Array.isArray(vendors) ? vendors : [])
        setOfficialLeads(Array.isArray(leads) ? leads : [])
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

  const hideActionForReport = (report) => {
    if (report?.targetType === 'marketplace_listing') return 'hide_listing'
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

  return (
    <div>
      <Navbar />
      <div className="container mt-4 mb-5" style={{ maxWidth: 980 }}>
        <h1 className="h4 mb-3">{t('admin.title')}</h1>
        {error && <div className="alert alert-danger">{error}</div>}

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
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((u) => (
                    <tr key={u.id}>
                      <td>{u.email}</td>
                      <td>{u.displayName || '-'}</td>
                      <td>{u.plan}</td>
                      <td>{u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-3 mt-3">
          <h2 className="h6 mb-3">Vendedores oficiales</h2>
          {officialVendors.length === 0 ? (
            <p className="text-muted small mb-0">No hay vendors oficiales configurados.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Marca</th>
                    <th>Ubicación</th>
                    <th>Score</th>
                    <th>Estado</th>
                    <th>Acciones</th>
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
                      <td>{v.enabled ? 'Activo' : 'Oculto'}</td>
                      <td>
                        <button
                          type="button"
                          className={`btn btn-sm ${v.enabled ? 'btn-outline-danger' : 'btn-outline-success'}`}
                          onClick={() => toggleOfficialVendor(v.id, !v.enabled)}
                        >
                          {v.enabled ? 'Desactivar' : 'Activar'}
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
          <h2 className="h6 mb-3">Solicitudes de vendors oficiales</h2>
          {officialLeads.length === 0 ? (
            <p className="text-muted small mb-0">No hay solicitudes nuevas.</p>
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
          <h2 className="h6 mb-3">{t('admin.openReports')}</h2>
          {reports.length === 0 ? (
            <p className="text-muted small mb-0">{t('admin.noReports')}</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>{t('admin.target')}</th>
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
