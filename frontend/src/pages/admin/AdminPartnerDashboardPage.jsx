import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import adminService from '../../services/adminService'
import PartnerVendorConfigModal from '../../components/admin/PartnerVendorConfigModal'
import { isFoundingPartnerTier } from '../../utils/partnerProgramTier'

export default function AdminPartnerDashboardPage() {
  const { t } = useTranslation()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [closureStatus, setClosureStatus] = useState(null)
  const [officialVendors, setOfficialVendors] = useState([])
  const [officialLeads, setOfficialLeads] = useState([])
  const [syncRuns, setSyncRuns] = useState([])
  const [partnerSyncLoading, setPartnerSyncLoading] = useState(false)
  const [partnerSyncMessage, setPartnerSyncMessage] = useState('')
  const [syncRunsLoading, setSyncRunsLoading] = useState(false)
  const [leadPromoteBusyId, setLeadPromoteBusyId] = useState(null)
  const [partnerCatalogBusyKey, setPartnerCatalogBusyKey] = useState(null)
  const [partnerConfigBusyId, setPartnerConfigBusyId] = useState(null)
  const [partnerConfigModalVendor, setPartnerConfigModalVendor] = useState(null)
  const [partnerSyncVendorBusyId, setPartnerSyncVendorBusyId] = useState(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const [dashboard, leads] = await Promise.all([
        adminService.partnerDashboard(),
        adminService.officialVendorLeads(),
      ])
      setSummary(dashboard?.summary ?? null)
      setClosureStatus(dashboard?.closureStatus ?? null)
      setOfficialVendors(Array.isArray(dashboard?.vendors) ? dashboard.vendors : [])
      setSyncRuns(Array.isArray(dashboard?.recentSyncRuns) ? dashboard.recentSyncRuns : [])
      setOfficialLeads(Array.isArray(leads) ? leads : [])
      setError('')
    } catch {
      setError(t('admin.loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const refreshSyncRuns = async () => {
    setSyncRunsLoading(true)
    try {
      const runs = await adminService.partnerSyncRuns()
      setSyncRuns(Array.isArray(runs) ? runs : [])
    } catch {
      setSyncRuns([])
    } finally {
      setSyncRunsLoading(false)
    }
  }

  const sendPartnerCatalogToVendor = async (vendor, locale = 'es') => {
    setPartnerCatalogBusyKey(`${vendor.id}:${locale}`)
    setError('')
    try {
      const data = await adminService.sendOfficialVendorPartnerCatalogEmail(vendor.id, { locale })
      setSuccess(t('admin.partnerCatalogEmailSent', { email: data?.email, count: data?.listingCount ?? 0 }))
    } catch {
      setError(t('admin.loadError'))
    } finally {
      setPartnerCatalogBusyKey(null)
    }
  }

  const sendPartnerCatalogToLead = async (lead, locale = 'es') => {
    setPartnerCatalogBusyKey(`lead:${lead.id}:${locale}`)
    setError('')
    try {
      const data = await adminService.sendOfficialVendorLeadPartnerCatalogEmail(lead.id, { locale })
      setSuccess(t('admin.partnerCatalogEmailSent', { email: data?.email, count: 0 }))
    } catch {
      setError(t('admin.loadError'))
    } finally {
      setPartnerCatalogBusyKey(null)
    }
  }

  const promoteLead = async (lead) => {
    if (!lead?.id || lead.status === 'converted') return
    if (!lead.websiteUrl?.trim()) {
      setError(t('admin.promoteLeadNeedsWebsite'))
      return
    }
    const tierRaw = window.prompt(t('admin.partnerPromoteTierPrompt'), 'official')
    if (tierRaw == null) return
    const tier = String(tierRaw).trim().toLowerCase()
    const isFounding = tier === 'founding' || tier === 'founder'
    const enableImport = window.confirm(t('admin.partnerPromoteImportConfirm'))
    const feedBaseUrl = window.prompt(t('admin.partnerFeedBaseUrlPrompt'), lead.websiteUrl || '')
    if (feedBaseUrl == null) return
    const badge = window.prompt(
      t('admin.partnerBadgePrompt'),
      isFounding ? 'Founding partner' : 'Official partner',
    )
    if (badge == null) return
    setLeadPromoteBusyId(lead.id)
    setError('')
    setSuccess('')
    try {
      const result = await adminService.promoteOfficialVendorLead(lead.id, {
        enableImport,
        strategicFounder: isFounding,
        partnerProgramTier: isFounding ? 'FOUNDING_PARTNER' : 'OFFICIAL_PARTNER',
        feedType: 'woocommerce',
        feedBaseUrl,
        badge,
      })
      const vendor = result?.vendor
      setOfficialLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, status: 'converted' } : l)),
      )
      if (vendor) {
        setOfficialVendors((prev) => [vendor, ...prev])
      }
      setSuccess(t('admin.promoteLeadSuccess', { slug: vendor?.slug || '' }))
      await loadDashboard()
    } catch {
      setError(t('admin.promoteLeadError'))
    } finally {
      setLeadPromoteBusyId(null)
    }
  }

  const saveOfficialVendorConfig = async (payload) => {
    const vendor = partnerConfigModalVendor
    if (!vendor?.id) return
    setPartnerConfigBusyId(vendor.id)
    setError('')
    setSuccess('')
    try {
      const updated = await adminService.updateOfficialVendorStrategicProgram(vendor.id, payload)
      setOfficialVendors((prev) => prev.map((v) => (String(v.id) === String(vendor.id) ? updated : v)))
      setSuccess(t('admin.partnerConfigSaved'))
      setPartnerConfigModalVendor(null)
      await loadDashboard()
    } catch {
      setError(t('admin.resolveError'))
    } finally {
      setPartnerConfigBusyId(null)
    }
  }

  const toggleOfficialVendor = async (vendorId, nextEnabled) => {
    try {
      const updated = await adminService.setOfficialVendorStatus(vendorId, nextEnabled)
      setOfficialVendors((prev) => prev.map((v) => (v.id === vendorId ? updated : v)))
      await loadDashboard()
    } catch {
      setError(t('admin.resolveError'))
    }
  }

  const patchVendorStrategic = async (vendorId, body) => {
    try {
      const updated = await adminService.updateOfficialVendorStrategicProgram(vendorId, body)
      setOfficialVendors((prev) =>
        prev.map((v) =>
          String(v.id) === String(vendorId)
            ? { ...v, ...updated, opsSummary: updated?.opsSummary ?? v.opsSummary }
            : v,
        ),
      )
      await loadDashboard()
    } catch {
      setError(t('admin.resolveError'))
    }
  }

  const patchPartnerTier = async (vendor, tier) => {
    const isFounding = tier === 'founding'
    await patchVendorStrategic(vendor.id, {
      partnerProgramTier: isFounding ? 'FOUNDING_PARTNER' : 'OFFICIAL_PARTNER',
      strategicFounder: isFounding,
      feedConfig: {
        ...(vendor.feedConfig || {}),
        partnerTier: isFounding ? 'founding' : 'official',
        boostLevel: isFounding ? 2 : 1,
      },
    })
  }

  const savePartnerBadge = async (vendor, badge) => {
    await patchVendorStrategic(vendor.id, { badge: String(badge || '').trim() })
  }

  const runPartnerSyncNow = async () => {
    setPartnerSyncLoading(true)
    setPartnerSyncMessage('')
    setError('')
    try {
      const runs = await adminService.runPartnerSync()
      const n = Array.isArray(runs) ? runs.length : 0
      setPartnerSyncMessage(t('admin.partnerSyncDone', { count: n }))
      await loadDashboard()
    } catch {
      setError(t('admin.partnerSyncError'))
    } finally {
      setPartnerSyncLoading(false)
    }
  }

  const runPartnerSyncForVendor = async (vendor) => {
    if (!vendor?.id || !vendor.listingImportEnabled) return
    setPartnerSyncVendorBusyId(vendor.id)
    setError('')
    try {
      const run = await adminService.runPartnerSyncForVendor(vendor.id)
      setPartnerSyncMessage(
        t('admin.partnerSyncVendorDone', {
          name: vendor.name,
          status: run?.status || '—',
        }),
      )
      await loadDashboard()
    } catch (err) {
      setError(err?.response?.data?.error || t('admin.partnerSyncError'))
    } finally {
      setPartnerSyncVendorBusyId(null)
    }
  }

  const syncStatusClass = (status) => {
    const s = String(status || '').toLowerCase()
    if (s === 'success') return 'text-success'
    if (s === 'failed' || s === 'error') return 'text-danger'
    if (s === 'running') return 'text-primary'
    return 'text-muted'
  }

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h2 className="h5 mb-1">{t('admin.partnerDashboardTitle')}</h2>
          <p className="small text-muted mb-0">{t('admin.partnerDashboardBlurb')}</p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link to="/admin/partner-outreach" className="btn btn-sm btn-outline-dark">
            {t('admin.partnerDashboardGoOutreach')}
          </Link>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => loadDashboard()} disabled={loading}>
            {loading ? t('common.loading') : t('admin.refresh')}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      {partnerSyncMessage && <div className="alert alert-success small py-2">{partnerSyncMessage}</div>}

      {summary && (
        <section className="row g-2 mb-4">
          <div className="col-6 col-md-3">
            <div className="card p-3 h-100">
              <div className="small text-muted">{t('admin.partnerDashboardSummaryTotal')}</div>
              <div className="h4 mb-0">{summary.totalPartners ?? 0}</div>
              <div className="small text-muted">
                {t('admin.partnerDashboardSummaryEnabled', { count: summary.enabledPartners ?? 0 })}
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card p-3 h-100">
              <div className="small text-muted">{t('admin.partnerDashboardSummaryImport')}</div>
              <div className="h4 mb-0">{summary.importEnabledCount ?? 0}</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card p-3 h-100">
              <div className="small text-muted">{t('admin.partnerDashboardSummaryListings')}</div>
              <div className="h4 mb-0">{summary.activeListingCount ?? 0}</div>
            </div>
          </div>
        </section>
      )}

      {closureStatus && (
        <section
          className={`card p-3 mb-4 border-2 ${closureStatus.allChecksPass ? 'border-success' : 'border-warning'}`}
          id="ecosystem-closure"
        >
          <h3 className="h6 mb-2">{t('admin.ecosystemClosureTitle')}</h3>
          <p className="small text-muted mb-2">{t('admin.ecosystemClosureBlurb')}</p>
          <ul className="list-unstyled small mb-2">
            {(closureStatus.checks || []).map((c) => (
              <li key={c.id} className="mb-1">
                <span className={c.ok ? 'text-success' : 'text-warning'}>{c.ok ? '✓' : '○'}</span>{' '}
                {t(`admin.ecosystemClosureCheck.${c.id}`, { defaultValue: c.detail })}
                {!c.ok && c.detail ? <span className="text-muted"> — {c.detail}</span> : null}
              </li>
            ))}
          </ul>
          {closureStatus.allChecksPass ? (
            <span className="badge text-bg-success">{t('admin.ecosystemClosureAllPass')}</span>
          ) : (
            <span className="badge text-bg-warning text-dark">{t('admin.ecosystemClosurePending')}</span>
          )}
        </section>
      )}

      <section className="card p-3 mb-4 border-warning">
        <h3 className="h6 mb-2">{t('admin.strategicPartnerSectionTitle')}</h3>
        <p className="small text-muted mb-2">{t('admin.strategicPartnerSectionBlurb')}</p>
        <div className="d-flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            className="btn btn-sm btn-dark"
            disabled={partnerSyncLoading}
            onClick={() => runPartnerSyncNow()}
          >
            {partnerSyncLoading ? t('admin.partnerSyncRunning') : t('admin.runPartnerSync')}
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => refreshSyncRuns()}>
            {syncRunsLoading ? t('common.loading') : t('admin.marketplaceLoadSyncRuns')}
          </button>
        </div>
        {syncRuns.length > 0 && (
          <div className="table-responsive">
            <table className="table table-sm mb-0">
              <thead>
                <tr>
                  <th>{t('admin.marketplaceSyncColVendor')}</th>
                  <th>{t('admin.marketplaceSyncColStatus')}</th>
                  <th>{t('admin.partnerDashboardSyncColCounts')}</th>
                  <th>{t('admin.created')}</th>
                </tr>
              </thead>
              <tbody>
                {syncRuns.slice(0, 20).map((run) => (
                  <tr key={run.id}>
                    <td className="small">
                      <div className="fw-semibold">{run.vendorName || run.vendorSlug || '—'}</div>
                      {run.vendorSlug ? <div className="text-muted">{run.vendorSlug}</div> : null}
                    </td>
                    <td className={`small ${syncStatusClass(run.status)}`}>{run.status || '—'}</td>
                    <td className="small text-muted">
                      {run.processedCount ?? 0} / {run.upsertedCount ?? 0} upserted
                      {(run.staleCount ?? 0) > 0 ? ` · ${run.staleCount} stale` : ''}
                      {(run.failedCount ?? 0) > 0 ? ` · ${run.failedCount} failed` : ''}
                    </td>
                    <td className="small">{run.startedAt ? new Date(run.startedAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card p-3 mb-4" id="badges-partners">
        <h3 className="h6 mb-3">{t('admin.officialVendorsTitle')}</h3>
        <p className="small text-muted mb-3">{t('admin.officialVendorsSyncHint')}</p>
        {loading ? (
          <p className="text-muted small mb-0">{t('common.loading')}</p>
        ) : officialVendors.length === 0 ? (
          <p className="text-muted small mb-0">{t('admin.officialVendorsEmpty')}</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>{t('admin.officialVendorsColBrand')}</th>
                  <th>{t('admin.officialVendorsColLocation')}</th>
                  <th>{t('admin.officialVendorsColScore')}</th>
                  <th>{t('admin.partnerOpsCol')}</th>
                  <th>{t('admin.officialVendorsColStatus')}</th>
                  <th>{t('admin.officialVendorsColTier')}</th>
                  <th>{t('admin.officialVendorsColBadge')}</th>
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
                      <div className="small d-flex flex-wrap gap-1 mt-1">
                        {v.feedType && <span className="badge text-bg-secondary">{v.feedType}</span>}
                        {v.feedBaseUrl && <span className="text-muted">{v.feedBaseUrl}</span>}
                      </div>
                    </td>
                    <td>{[v.city, v.state, v.country].filter(Boolean).join(' · ') || '-'}</td>
                    <td>{v.influenceScore ?? 0}</td>
                    <td className="small">
                      {v.opsSummary ? (
                        <>
                          <div>
                            {t('admin.partnerOpsHandoffs', {
                              count: v.opsSummary.handoffs30d ?? 0,
                            })}
                          </div>
                          {v.opsSummary.latestSync ? (
                            <div className="text-muted">
                              {t('admin.partnerOpsSync', {
                                status: v.opsSummary.latestSync.status || '—',
                                upserted: v.opsSummary.latestSync.upsertedCount ?? 0,
                                processed: v.opsSummary.latestSync.processedCount ?? 0,
                              })}
                              {(v.opsSummary.latestSync.staleCount ?? 0) > 0
                                ? ` · stale ${v.opsSummary.latestSync.staleCount}`
                                : ''}
                            </div>
                          ) : (
                            <div className="text-muted">{t('admin.partnerOpsNoSync')}</div>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{v.enabled ? t('admin.officialVendorsActive') : t('admin.officialVendorsHidden')}</td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        style={{ minWidth: 130 }}
                        value={isFoundingPartnerTier(v) ? 'founding' : 'official'}
                        onChange={(e) => patchPartnerTier(v, e.target.value)}
                      >
                        <option value="official">{t('admin.partnerTierOfficial')}</option>
                        <option value="founding">{t('admin.partnerTierFounding')}</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        style={{ minWidth: 140 }}
                        defaultValue={v.badge || (isFoundingPartnerTier(v) ? 'Founding partner' : 'Official partner')}
                        onBlur={(e) => {
                          const next = e.target.value.trim()
                          const prev = (v.badge || '').trim()
                          if (next !== prev) savePartnerBadge(v, next)
                        }}
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
                      <div className="d-flex flex-column gap-1">
                        <button
                          type="button"
                          className={`btn btn-sm ${v.enabled ? 'btn-outline-danger' : 'btn-outline-success'}`}
                          onClick={() => toggleOfficialVendor(v.id, !v.enabled)}
                        >
                          {v.enabled ? t('admin.officialVendorsDeactivate') : t('admin.officialVendorsActivate')}
                        </button>
                        {v.listingImportEnabled ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning"
                            disabled={partnerSyncVendorBusyId === v.id}
                            onClick={() => runPartnerSyncForVendor(v)}
                          >
                            {partnerSyncVendorBusyId === v.id
                              ? t('common.loading')
                              : t('admin.partnerTestSync')}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-dark"
                          disabled={partnerConfigBusyId === v.id}
                          onClick={() => setPartnerConfigModalVendor(v)}
                        >
                          {partnerConfigBusyId === v.id ? t('common.loading') : t('admin.partnerEditConfig')}
                        </button>
                        <div className="btn-group btn-group-sm">
                          {['es', 'en'].map((loc) => (
                            <button
                              key={loc}
                              type="button"
                              className="btn btn-outline-primary"
                              disabled={partnerCatalogBusyKey === `${v.id}:${loc}`}
                              onClick={() => sendPartnerCatalogToVendor(v, loc)}
                            >
                              {partnerCatalogBusyKey === `${v.id}:${loc}` ? '…' : `📧 ${loc}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card p-3 mb-4">
        <h3 className="h6 mb-3">{t('admin.officialLeadsTitle')}</h3>
        <p className="small text-muted mb-2">
          {t('admin.partnerDashboardLeadsHint')}{' '}
          <Link to="/admin/partner-outreach">{t('admin.navPartnerOutreach')}</Link>
        </p>
        {officialLeads.length === 0 ? (
          <p className="text-muted small mb-0">{t('admin.officialLeadsEmpty')}</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>{t('admin.officialLeadsColBrand')}</th>
                  <th>{t('admin.officialLeadsColContact')}</th>
                  <th>{t('admin.officialLeadsColCoverage')}</th>
                  <th>{t('admin.officialLeadsColNotes')}</th>
                  <th>{t('admin.created')}</th>
                  <th>{t('admin.officialLeadsColActions')}</th>
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
                    <td>
                      {lead.status === 'converted' ? (
                        <span className="badge bg-secondary">{t('admin.promoteLeadConverted')}</span>
                      ) : (
                        <div className="d-flex flex-column gap-1">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-dark"
                            disabled={leadPromoteBusyId === lead.id}
                            onClick={() => promoteLead(lead)}
                          >
                            {leadPromoteBusyId === lead.id ? t('common.loading') : t('admin.promoteLeadToVendor')}
                          </button>
                          <div className="btn-group btn-group-sm">
                            {['es', 'en'].map((loc) => (
                              <button
                                key={loc}
                                type="button"
                                className="btn btn-outline-secondary"
                                disabled={partnerCatalogBusyKey === `lead:${lead.id}:${loc}`}
                                onClick={() => sendPartnerCatalogToLead(lead, loc)}
                                title={t('admin.sendPartnerCatalogHint')}
                              >
                                {partnerCatalogBusyKey === `lead:${lead.id}:${loc}` ? '…' : `📧 ${loc}`}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {partnerConfigModalVendor ? (
        <PartnerVendorConfigModal
          vendor={partnerConfigModalVendor}
          busy={partnerConfigBusyId === partnerConfigModalVendor.id}
          onClose={() => setPartnerConfigModalVendor(null)}
          onSave={saveOfficialVendorConfig}
        />
      ) : null}
    </>
  )
}
