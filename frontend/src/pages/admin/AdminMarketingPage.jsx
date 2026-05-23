import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import adminService from '../../services/adminService'
import marketplaceService from '../../services/marketplaceService'

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
  const [tapRate, setTapRate] = useState(null)
  const [listingCounts, setListingCounts] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyVendorId, setBusyVendorId] = useState(null)
  const [newsletterTitle, setNewsletterTitle] = useState('')
  const [listingQuery, setListingQuery] = useState('')
  const [listingOptions, setListingOptions] = useState([])
  const [selectedListingIds, setSelectedListingIds] = useState([])
  const [newsletterDraft, setNewsletterDraft] = useState(null)
  const [subscriberCount, setSubscriberCount] = useState(0)
  const [newsletterBusy, setNewsletterBusy] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [liveTopVendors, setLiveTopVendors] = useState([])

  const reload = () => {
    setLoading(true)
    Promise.all([
      adminService.summary(),
      adminService.vendorUsers(500, true),
      adminService.betaStats().catch(() => null),
      adminService.officialVendors().catch(() => []),
      adminService.officialVendorLeads().catch(() => []),
      adminService.tapToContactRate().catch(() => null),
      adminService.listingCounts().catch(() => null),
      adminService.newsletterSubscriberCount().catch(() => ({ count: 0 })),
      adminService.liveTopVendors(3).catch(() => []),
    ])
      .then(([s, vendorsPack, beta, partners, leads, rate, counts, subs, topVendors]) => {
        setSummary(s)
        setVendors(Array.isArray(vendorsPack?.users) ? vendorsPack.users : [])
        setTotalVendors(typeof vendorsPack?.totalVendors === 'number' ? vendorsPack.totalVendors : 0)
        setTotalPendingInvites(
          typeof vendorsPack?.totalPendingInvites === 'number' ? vendorsPack.totalPendingInvites : 0,
        )
        setBetaStats(beta && typeof beta === 'object' ? beta : null)
        setOfficialVendors(Array.isArray(partners) ? partners : [])
        setOfficialLeads(Array.isArray(leads) ? leads : [])
        setTapRate(rate && typeof rate === 'object' ? rate : null)
        setListingCounts(counts && typeof counts === 'object' ? counts : null)
        setSubscriberCount(typeof subs?.count === 'number' ? subs.count : 0)
        setLiveTopVendors(Array.isArray(topVendors) ? topVendors : [])
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

  useEffect(() => {
    const q = listingQuery.trim()
    if (q.length < 2) {
      setListingOptions([])
      return
    }
    let cancelled = false
    marketplaceService.listPublic({ q, status: 'active' }).then((rows) => {
      if (!cancelled) setListingOptions(Array.isArray(rows) ? rows.slice(0, 20) : [])
    })
    return () => {
      cancelled = true
    }
  }, [listingQuery])

  const toggleListingSelection = (id) => {
    setSelectedListingIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const createNewsletterDraft = async () => {
    if (selectedListingIds.length === 0) {
      setError(t('admin.mkt.newsletterNeedListings'))
      return
    }
    setNewsletterBusy(true)
    setError('')
    try {
      const draft = await adminService.createNewsletterDraft({
        title: newsletterTitle || t('admin.mkt.dropsTitle'),
        listingIds: selectedListingIds,
      })
      setNewsletterDraft(draft)
      setSuccess(t('admin.mkt.newsletterDraftSaved'))
    } catch (e) {
      setError(e?.response?.data?.message || t('admin.mkt.newsletterDraftError'))
    } finally {
      setNewsletterBusy(false)
    }
  }

  const sendNewsletter = async () => {
    if (!newsletterDraft?.id) return
    if (!window.confirm(t('admin.mkt.newsletterSendConfirm', { count: subscriberCount }))) return
    setNewsletterBusy(true)
    setError('')
    try {
      const result = await adminService.sendNewsletterDraft(newsletterDraft.id)
      setSuccess(t('admin.mkt.newsletterSent', { sent: result?.sent ?? 0 }))
      setNewsletterDraft(null)
      setSelectedListingIds([])
    } catch (e) {
      setError(e?.response?.data?.message || t('admin.mkt.newsletterSendError'))
    } finally {
      setNewsletterBusy(false)
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
              <div className="h5 mb-0">{listingCounts?.total ?? totalActiveListings}</div>
              <small className="text-muted">
                {t('admin.mkt.cardListingsBreakdown', {
                  peer: listingCounts?.peerActive ?? totalActiveListings,
                  partner: listingCounts?.partnerActive ?? 0,
                })}
              </small>
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

      {tapRate && (
        <div className="card p-3 mb-4">
          <h3 className="h6 mb-1">{t('admin.mkt.northMetricTitle')}</h3>
          <p className="small text-muted mb-3">{t('admin.mkt.northMetricBlurb')}</p>
          <div className="row g-2">
            <div className="col-6 col-md-3">
              <div className="border rounded p-2 small">
                <div className="text-muted">{t('admin.mkt.northMetricViews7d')}</div>
                <div className="h6 mb-0">{tapRate.views7d ?? 0}</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="border rounded p-2 small">
                <div className="text-muted">{t('admin.mkt.northMetricTaps7d')}</div>
                <div className="h6 mb-0">{tapRate.contactTaps7d ?? 0}</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="border rounded p-2 small">
                <div className="text-muted">{t('admin.mkt.northMetricRate7d')}</div>
                <div className="h6 mb-0">
                  {Math.round(((tapRate.contactTapRate7d ?? 0) * 100) * 10) / 10}%
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="border rounded p-2 small">
                <div className="text-muted">{t('admin.mkt.northMetricRate30d')}</div>
                <div className="h6 mb-0">
                  {Math.round(((tapRate.contactTapRate30d ?? 0) * 100) * 10) / 10}%
                </div>
              </div>
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
        <p className="small text-muted mb-2">
          {t('admin.mkt.newsletterSubscribers', { count: subscriberCount })}
        </p>
        <input
          className="form-control form-control-sm mb-2"
          value={newsletterTitle}
          onChange={(e) => setNewsletterTitle(e.target.value)}
          placeholder={t('admin.mkt.newsletterTitlePlaceholder')}
        />
        <input
          className="form-control form-control-sm mb-2"
          value={listingQuery}
          onChange={(e) => setListingQuery(e.target.value)}
          placeholder={t('admin.mkt.newsletterSearchPlaceholder')}
        />
        <div className="border rounded p-2 mb-2" style={{ maxHeight: 180, overflowY: 'auto' }}>
          {listingOptions.map((l) => (
            <label key={l.id} className="d-flex align-items-start gap-2 small mb-1">
              <input
                type="checkbox"
                checked={selectedListingIds.includes(l.id)}
                onChange={() => toggleListingSelection(l.id)}
              />
              <span>{l.title} {l.speciesName ? `· ${l.speciesName}` : ''}</span>
            </label>
          ))}
        </div>
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-sm btn-outline-dark" disabled={newsletterBusy} onClick={createNewsletterDraft}>
            {newsletterBusy ? t('common.saving') : t('admin.mkt.newsletterPreview')}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-dark"
            disabled={newsletterBusy || !newsletterDraft?.id}
            onClick={() => setShowPreview(true)}
          >
            {t('admin.mkt.newsletterOpenPreview')}
          </button>
          <button type="button" className="btn btn-sm btn-warning" disabled={newsletterBusy || !newsletterDraft?.id} onClick={sendNewsletter}>
            {t('admin.mkt.newsletterSend')}
          </button>
        </div>
      </div>

      {showPreview && newsletterDraft?.bodyHtml && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.45)' }} role="dialog">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title h6">{newsletterDraft.title}</h4>
                <button type="button" className="btn-close" onClick={() => setShowPreview(false)} aria-label="Close" />
              </div>
              <div className="modal-body">
                <p className="small text-muted">{t('admin.mkt.newsletterPreviewHint')}</p>
                <div dangerouslySetInnerHTML={{ __html: newsletterDraft.bodyHtml }} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card p-3">
        <h3 className="h6 mb-1">{t('admin.mkt.topVendorsLiveTitle')}</h3>
        <p className="small text-muted mb-2">{t('admin.mkt.topVendorsLiveBlurb')}</p>
        {liveTopVendors.length === 0 ? (
          <p className="small text-muted mb-0">{t('admin.mkt.topVendorsLiveEmpty')}</p>
        ) : (
          <ul className="small mb-0">
            {liveTopVendors.map((v) => {
              const name = v.storefrontName || v.displayName || v.handle || 'Vendor'
              const ratePct = Math.round((v.contactTapRate ?? 0) * 1000) / 10
              return (
                <li key={v.userId}>
                  {t('admin.mkt.topVendorsLiveRank', { rank: v.rank ?? '?' })}{' '}
                  <strong>{name}</strong>
                  {' — '}
                  {t('admin.mkt.topVendorsLiveRate', { rate: ratePct, views: v.views30d ?? 0 })}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
