import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import adminService from '../../services/adminService'

const STORAGE_KEY = 'tarantulapp_admin_marketing_v1'

function downloadCsv(filename, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return
  const headers = Object.keys(rows[0])
  const escape = (val) => {
    if (val == null) return ''
    const s = String(val)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','))
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function vendorCountry(u) {
  return u?.country || u?.profileCountry || u?.profile?.country || ''
}

function vendorActiveListings(u) {
  const totals = u?.marketplaceListingTotals
  if (totals && typeof totals.active === 'number') return totals.active
  if (totals && typeof totals.all === 'number') return totals.all
  return 0
}

function vendorSoldCount(u) {
  return u?.marketplaceListingTotals?.sold ?? 0
}

function groupByCountry(items, key = vendorCountry) {
  const map = new Map()
  for (const it of items) {
    const c = (key(it) || '').toUpperCase() || 'XX'
    map.set(c, (map.get(c) || 0) + 1)
  }
  return [...map.entries()]
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
}

export default function AdminMarketingPage() {
  const { t } = useTranslation()
  const [summary, setSummary] = useState(null)
  const [vendors, setVendors] = useState([])
  const [totalVendors, setTotalVendors] = useState(0)
  const [totalPendingInvites, setTotalPendingInvites] = useState(0)
  const [betaStats, setBetaStats] = useState(null)
  const [officialVendors, setOfficialVendors] = useState([])
  const [officialLeads, setOfficialLeads] = useState([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyVendorId, setBusyVendorId] = useState(null)
  const [draftNotes, setDraftNotes] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || ''
    } catch {
      return ''
    }
  })

  const reload = () => {
    setLoading(true)
    Promise.all([
      adminService.summary(),
      adminService.vendorUsers(500, true),
      adminService.betaStats().catch(() => null),
      adminService.officialVendors().catch(() => []),
      adminService.officialVendorLeads().catch(() => []),
    ])
      .then(([s, vendorsPack, beta, partners, leads]) => {
        setSummary(s)
        setVendors(Array.isArray(vendorsPack?.users) ? vendorsPack.users : [])
        setTotalVendors(typeof vendorsPack?.totalVendors === 'number' ? vendorsPack.totalVendors : 0)
        setTotalPendingInvites(
          typeof vendorsPack?.totalPendingInvites === 'number' ? vendorsPack.totalPendingInvites : 0,
        )
        setBetaStats(beta && typeof beta === 'object' ? beta : null)
        setOfficialVendors(Array.isArray(partners) ? partners : [])
        setOfficialLeads(Array.isArray(leads) ? leads : [])
      })
      .catch((err) => {
        const code = err?.response?.status
        setError(code === 403 ? t('admin.onlyAdmins') : t('admin.loadError'))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const verifiedCount = useMemo(() => vendors.filter((v) => v.verifiedBreeder).length, [vendors])
  const verifiableQueue = useMemo(
    () => vendors.filter((v) => !v.verifiedBreeder && vendorActiveListings(v) > 0).slice(0, 50),
    [vendors],
  )
  const vendorsByCountry = useMemo(() => groupByCountry(vendors), [vendors])
  const partnersByCountry = useMemo(
    () =>
      groupByCountry(
        officialVendors.map((p) => ({ country: p?.country })),
        (it) => it.country,
      ),
    [officialVendors],
  )
  const betaByCountry = useMemo(() => {
    const rows = Array.isArray(betaStats?.byCountry) ? betaStats.byCountry : []
    return rows
      .map((row) => ({ country: (row.country || 'XX').toUpperCase(), count: row.total ?? 0 }))
      .sort((a, b) => b.count - a.count)
  }, [betaStats])

  const totalActiveListings = useMemo(
    () => vendors.reduce((sum, v) => sum + vendorActiveListings(v), 0),
    [vendors],
  )

  const handleToggleVerified = async (user) => {
    setBusyVendorId(user.id)
    setError('')
    setSuccess('')
    try {
      const updated = await adminService.setUserVerifiedBreeder(user.id, !user.verifiedBreeder)
      setVendors((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, ...updated, verifiedBreeder: updated.verifiedBreeder } : u)),
      )
      setSuccess(t('admin.mkt.verifiedToggleSuccess'))
    } catch {
      setError(t('admin.mkt.verifiedToggleError'))
    } finally {
      setBusyVendorId(null)
    }
  }

  const exportVendorsCsv = () => {
    const rows = vendors.map((u) => ({
      email: u.email || '',
      handle: u.publicHandle || '',
      country: vendorCountry(u) || '',
      verified: u.verifiedBreeder ? 'yes' : 'no',
      listings_active: vendorActiveListings(u),
      listings_sold: vendorSoldCount(u),
      plan: u.plan || 'FREE',
      in_trial: u.inTrial ? 'yes' : 'no',
      last_activity: u.lastActivityAt || '',
    }))
    if (rows.length === 0) {
      setError(t('admin.mkt.exportEmpty'))
      return
    }
    downloadCsv(`tarantulapp-vendors-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  const exportPartnerLeadsCsv = () => {
    const rows = officialLeads.map((l) => ({
      business: l.businessName || '',
      contact: l.contactName || '',
      email: l.contactEmail || '',
      city: l.city || '',
      state: l.state || '',
      country: l.country || '',
      created_at: l.createdAt || '',
    }))
    if (rows.length === 0) {
      setError(t('admin.mkt.exportEmpty'))
      return
    }
    downloadCsv(`tarantulapp-partner-leads-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  const saveNotes = (value) => {
    setDraftNotes(value)
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <h2 className="h5 mb-1">{t('admin.mkt.title')}</h2>
      <p className="small text-muted mb-3">{t('admin.mkt.blurb')}</p>

      {error && <div className="alert alert-danger small py-2">{error}</div>}
      {success && <div className="alert alert-success small py-2">{success}</div>}

      {loading && <p className="small text-muted">{t('admin.loading')}</p>}

      {summary && (
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="card p-3">
              <small className="text-muted">{t('admin.mkt.cardUsers')}</small>
              <div className="h5 mb-0">{summary.usersTotal}</div>
              <small className="text-muted">{t('admin.mkt.cardUsers7d', { n: summary.usersLast7d ?? 0 })}</small>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card p-3">
              <small className="text-muted">{t('admin.mkt.cardVendors')}</small>
              <div className="h5 mb-0">{totalVendors}</div>
              <small className="text-muted">
                {t('admin.mkt.cardVendorsVerified', { n: verifiedCount })} · {t('admin.mkt.cardVendorsPending', { n: totalPendingInvites })}
              </small>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card p-3">
              <small className="text-muted">{t('admin.mkt.cardListings')}</small>
              <div className="h5 mb-0">{totalActiveListings}</div>
              <small className="text-muted">{t('admin.mkt.cardListingsBlurb')}</small>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card p-3">
              <small className="text-muted">{t('admin.mkt.cardTarantulas')}</small>
              <div className="h5 mb-0">{summary.tarantulasTotal}</div>
              <small className="text-muted">{t('admin.mkt.cardTarantulasBlurb')}</small>
            </div>
          </div>
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-6">
          <div className="card p-3 h-100">
            <div className="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
              <div>
                <h3 className="h6 mb-0">{t('admin.mkt.vendorsByCountryTitle')}</h3>
                <small className="text-muted">{t('admin.mkt.vendorsByCountryBlurb')}</small>
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={exportVendorsCsv}>
                {t('admin.mkt.exportCsv')}
              </button>
            </div>
            {vendorsByCountry.length === 0 ? (
              <p className="small text-muted mb-0">{t('admin.mkt.noData')}</p>
            ) : (
              <table className="table table-sm align-middle mb-0 small">
                <thead>
                  <tr>
                    <th>{t('admin.mkt.colCountry')}</th>
                    <th className="text-end">{t('admin.mkt.colVendors')}</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorsByCountry.map((row) => (
                    <tr key={row.country}>
                      <td>{row.country === 'XX' ? t('admin.mkt.countryUnknown') : row.country}</td>
                      <td className="text-end">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card p-3 h-100">
            <h3 className="h6 mb-0">{t('admin.mkt.betaByCountryTitle')}</h3>
            <small className="text-muted">{t('admin.mkt.betaByCountryBlurb')}</small>
            {betaByCountry.length === 0 ? (
              <p className="small text-muted mb-0 mt-2">{t('admin.mkt.noData')}</p>
            ) : (
              <table className="table table-sm align-middle mb-0 small mt-2">
                <thead>
                  <tr>
                    <th>{t('admin.mkt.colCountry')}</th>
                    <th className="text-end">{t('admin.mkt.colSignups')}</th>
                  </tr>
                </thead>
                <tbody>
                  {betaByCountry.slice(0, 15).map((row) => (
                    <tr key={row.country}>
                      <td>{row.country === 'XX' ? t('admin.mkt.countryUnknown') : row.country}</td>
                      <td className="text-end">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card p-3 h-100">
            <h3 className="h6 mb-0">{t('admin.mkt.partnersByCountryTitle')}</h3>
            <small className="text-muted">{t('admin.mkt.partnersByCountryBlurb')}</small>
            {partnersByCountry.length === 0 ? (
              <p className="small text-muted mb-0 mt-2">{t('admin.mkt.noData')}</p>
            ) : (
              <table className="table table-sm align-middle mb-0 small mt-2">
                <thead>
                  <tr>
                    <th>{t('admin.mkt.colCountry')}</th>
                    <th className="text-end">{t('admin.mkt.colPartners')}</th>
                  </tr>
                </thead>
                <tbody>
                  {partnersByCountry.map((row) => (
                    <tr key={row.country}>
                      <td>{row.country === 'XX' ? t('admin.mkt.countryUnknown') : row.country}</td>
                      <td className="text-end">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card p-3 h-100">
            <div className="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
              <div>
                <h3 className="h6 mb-0">{t('admin.mkt.partnerLeadsTitle')}</h3>
                <small className="text-muted">{t('admin.mkt.partnerLeadsBlurb')}</small>
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={exportPartnerLeadsCsv}>
                {t('admin.mkt.exportCsv')}
              </button>
            </div>
            {officialLeads.length === 0 ? (
              <p className="small text-muted mb-0">{t('admin.mkt.noLeads')}</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0 small">
                  <thead>
                    <tr>
                      <th>{t('admin.mkt.colBusiness')}</th>
                      <th>{t('admin.mkt.colCountry')}</th>
                      <th>{t('admin.mkt.colContact')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {officialLeads.slice(0, 20).map((l, idx) => (
                      <tr key={`${l.contactEmail || idx}`}>
                        <td className="text-nowrap">{l.businessName || '—'}</td>
                        <td>{l.country || '—'}</td>
                        <td className="text-nowrap small text-muted">{l.contactEmail || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card p-3 mb-4">
        <div className="d-flex justify-content-between align-items-start mb-2 flex-wrap gap-2">
          <div>
            <h3 className="h6 mb-0">{t('admin.mkt.verifyQueueTitle')}</h3>
            <small className="text-muted">{t('admin.mkt.verifyQueueBlurb')}</small>
          </div>
          <span className="badge bg-secondary align-self-center">
            {t('admin.mkt.verifyQueueCount', { n: verifiableQueue.length })}
          </span>
        </div>
        {verifiableQueue.length === 0 ? (
          <p className="small text-muted mb-0">{t('admin.mkt.verifyQueueEmpty')}</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0 small">
              <thead>
                <tr>
                  <th>{t('auth.email')}</th>
                  <th>{t('admin.vendorsHandle')}</th>
                  <th className="text-end">{t('admin.vendorsColListings')}</th>
                  <th className="text-end">{t('admin.vendorsColSold')}</th>
                  <th>{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {verifiableQueue.map((u) => (
                  <tr key={u.id}>
                    <td className="text-nowrap">{u.email}</td>
                    <td>{u.publicHandle || '—'}</td>
                    <td className="text-end">{vendorActiveListings(u)}</td>
                    <td className="text-end">{vendorSoldCount(u)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-dark"
                        disabled={busyVendorId === u.id}
                        onClick={() => handleToggleVerified(u)}
                      >
                        {busyVendorId === u.id ? t('common.saving') : t('admin.mkt.markVerified')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card p-3 mb-4">
        <h3 className="h6 mb-1">{t('admin.mkt.dropsTitle')}</h3>
        <p className="small text-muted mb-2">{t('admin.mkt.dropsBlurb')}</p>
        <textarea
          className="form-control"
          rows={6}
          value={draftNotes}
          onChange={(e) => saveNotes(e.target.value)}
          placeholder={t('admin.mkt.dropsPlaceholder')}
        />
        <p className="small text-muted mb-0 mt-2">{t('admin.mkt.dropsAutosave')}</p>
      </div>

      <div className="card p-3">
        <h3 className="h6 mb-1">{t('admin.mkt.upcomingTitle')}</h3>
        <p className="small text-muted mb-2">{t('admin.mkt.upcomingBlurb')}</p>
        <ul className="small mb-0">
          <li>{t('admin.mkt.upcomingNewsletter')}</li>
          <li>{t('admin.mkt.upcomingAssetKit')}</li>
          <li>{t('admin.mkt.upcomingTopVendor')}</li>
          <li>{t('admin.mkt.upcomingTapRate')}</li>
        </ul>
      </div>
    </div>
  )
}
