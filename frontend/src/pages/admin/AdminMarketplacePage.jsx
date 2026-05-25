import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import adminService from '../../services/adminService'
import { formatAdminPlanSummary, adminPlanBadgeClass } from './adminShared'

function sellerTierKey(row) {
  if (row?.verifiedBreeder) return 'vendor'
  const plan = String(row?.plan || 'FREE').toUpperCase()
  if (plan === 'PRO' || row?.inTrial) return 'pro'
  return 'community'
}

export default function AdminMarketplacePage() {
  const { t } = useTranslation()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [sellerQuery, setSellerQuery] = useState('')
  const [vendorsOnly, setVendorsOnly] = useState(false)
  const [sellers, setSellers] = useState([])
  const [sellersLoading, setSellersLoading] = useState(true)
  const [vendorBusyId, setVendorBusyId] = useState(null)
  const [planBusyId, setPlanBusyId] = useState(null)

  const [reports, setReports] = useState([])
  const [officialVendors, setOfficialVendors] = useState([])
  const [officialLeads, setOfficialLeads] = useState([])
  const [partnerSyncLoading, setPartnerSyncLoading] = useState(false)
  const [partnerSyncMessage, setPartnerSyncMessage] = useState('')
  const [syncRuns, setSyncRuns] = useState([])
  const [syncRunsLoading, setSyncRunsLoading] = useState(false)
  const [leadPromoteBusyId, setLeadPromoteBusyId] = useState(null)
  const [vendorVerifications, setVendorVerifications] = useState([])
  const [verificationBusyId, setVerificationBusyId] = useState(null)
  const [partnerCatalogBusyKey, setPartnerCatalogBusyKey] = useState(null)
  const [partnerConfigBusyId, setPartnerConfigBusyId] = useState(null)

  const loadSellers = useCallback(async () => {
    setSellersLoading(true)
    try {
      const data = await adminService.marketplaceSellers({
        q: sellerQuery.trim() || undefined,
        limit: 80,
        vendorsOnly: vendorsOnly || undefined,
      })
      setSellers(Array.isArray(data?.sellers) ? data.sellers : [])
    } catch {
      setSellers([])
      setError(t('admin.loadError'))
    } finally {
      setSellersLoading(false)
    }
  }, [sellerQuery, vendorsOnly, t])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      adminService.reports('open'),
      adminService.officialVendors(),
      adminService.officialVendorLeads(),
      adminService.vendorVerifications('pending').catch(() => []),
    ])
      .then(([openReports, vendors, leads, verifications]) => {
        if (cancelled) return
        setReports(Array.isArray(openReports) ? openReports : [])
        setOfficialVendors(Array.isArray(vendors) ? vendors : [])
        setOfficialLeads(Array.isArray(leads) ? leads : [])
        setVendorVerifications(Array.isArray(verifications) ? verifications : [])
      })
      .catch(() => {
        if (!cancelled) setError(t('admin.loadError'))
      })
    return () => {
      cancelled = true
    }
  }, [t])

  useEffect(() => {
    const id = window.setTimeout(() => loadSellers(), 280)
    return () => window.clearTimeout(id)
  }, [loadSellers])

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
    const tierRaw = window.prompt(
      t('admin.partnerPromoteTierPrompt', { defaultValue: 'Partner tier: official or founding' }),
      'official',
    )
    if (tierRaw == null) return
    const tier = String(tierRaw).trim().toLowerCase()
    const isFounding = tier === 'founding' || tier === 'founder'
    const enableImport = window.confirm(t('admin.partnerPromoteImportConfirm', { defaultValue: 'Enable approved catalog sync now?' }))
    const feedBaseUrl = window.prompt(
      t('admin.partnerFeedBaseUrlPrompt', { defaultValue: 'Feed/store base URL' }),
      lead.websiteUrl || '',
    )
    if (feedBaseUrl == null) return
    const badge = window.prompt(
      t('admin.partnerBadgePrompt', { defaultValue: 'Public partner badge' }),
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
    } catch {
      setError(t('admin.promoteLeadError'))
    } finally {
      setLeadPromoteBusyId(null)
    }
  }

  const editOfficialVendorConfig = async (vendor) => {
    if (!vendor?.id) return
    const tierRaw = window.prompt(
      t('admin.partnerPromoteTierPrompt', { defaultValue: 'Partner tier: official or founding' }),
      vendor.isFoundingPartner ? 'founding' : 'official',
    )
    if (tierRaw == null) return
    const tier = String(tierRaw).trim().toLowerCase()
    const isFounding = tier === 'founding' || tier === 'founder'
    const badge = window.prompt(
      t('admin.partnerBadgePrompt', { defaultValue: 'Public partner badge' }),
      vendor.badge || (isFounding ? 'Founding partner' : 'Official partner'),
    )
    if (badge == null) return
    const websiteUrl = window.prompt(
      t('admin.partnerWebsitePrompt', { defaultValue: 'Partner website URL' }),
      vendor.websiteUrl || '',
    )
    if (websiteUrl == null) return
    const feedBaseUrl = window.prompt(
      t('admin.partnerFeedBaseUrlPrompt', { defaultValue: 'Feed/store base URL' }),
      vendor.feedBaseUrl || websiteUrl || '',
    )
    if (feedBaseUrl == null) return
    const feedType = window.prompt(
      t('admin.partnerFeedTypePrompt', { defaultValue: 'Feed type' }),
      vendor.feedType || 'woocommerce',
    )
    if (feedType == null) return
    setPartnerConfigBusyId(vendor.id)
    setError('')
    setSuccess('')
    try {
      const updated = await adminService.updateOfficialVendorStrategicProgram(vendor.id, {
        partnerProgramTier: isFounding ? 'FOUNDING_PARTNER' : 'OFFICIAL_PARTNER',
        strategicFounder: isFounding,
        badge,
        websiteUrl,
        feedBaseUrl,
        feedType,
        feedConfig: {
          ...(vendor.feedConfig || {}),
          partnerTier: isFounding ? 'founding' : 'official',
          boostLevel: isFounding ? 2 : 1,
        },
      })
      setOfficialVendors((prev) => prev.map((v) => (String(v.id) === String(vendor.id) ? updated : v)))
      setSuccess(t('admin.partnerConfigSaved', { defaultValue: 'Partner config saved.' }))
    } catch {
      setError(t('admin.resolveError'))
    } finally {
      setPartnerConfigBusyId(null)
    }
  }

  const loadSyncRuns = async () => {
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

  const toggleVerifiedBreeder = async (row) => {
    const next = !row?.verifiedBreeder
    setVendorBusyId(row.id)
    setError('')
    setSuccess('')
    try {
      const updated = await adminService.setVerifiedBreeder(row.id, next)
      setSellers((prev) =>
        prev.map((s) =>
          String(s.id) === String(row.id)
            ? {
                ...s,
                verifiedBreeder: !!updated?.verifiedBreeder,
                verifiedBreederAt: updated?.verifiedBreederAt ?? null,
                sellerProgram: {
                  ...s.sellerProgram,
                  tier: next ? 'vendor' : sellerTierKey({ ...s, verifiedBreeder: false }),
                  reviewedVendor: !!updated?.verifiedBreeder,
                  activeListingLimit: next ? 250 : s.sellerProgram?.activeListingLimit,
                },
              }
            : s,
        ),
      )
      setSuccess(next ? t('admin.marketplaceVendorEnabled') : t('admin.marketplaceVendorDisabled'))
    } catch {
      setError(t('admin.resolveError'))
    } finally {
      setVendorBusyId(null)
    }
  }

  const patchPlan = async (row, payload) => {
    setPlanBusyId(row.id)
    setError('')
    setSuccess('')
    try {
      const updated = await adminService.patchUserPlan(row.id, payload)
      setSellers((prev) =>
        prev.map((s) =>
          String(s.id) === String(row.id)
            ? {
                ...s,
                plan: updated?.plan ?? s.plan,
                inTrial: typeof updated?.inTrial === 'boolean' ? updated.inTrial : s.inTrial,
                trialEndsAt: updated?.trialEndsAt !== undefined ? updated.trialEndsAt : s.trialEndsAt,
                hasProFeatures: typeof updated?.hasProFeatures === 'boolean' ? updated.hasProFeatures : s.hasProFeatures,
                sellerProgram: {
                  ...s.sellerProgram,
                  tier: row.verifiedBreeder ? 'vendor' : String(updated?.plan || '').toUpperCase() === 'PRO' ? 'pro' : s.sellerProgram?.tier,
                  proPlan: String(updated?.plan || '').toUpperCase() === 'PRO',
                },
              }
            : s,
        ),
      )
      setSuccess(t('admin.planUpdated'))
    } catch {
      setError(t('admin.planUpdateError'))
    } finally {
      setPlanBusyId(null)
    }
  }

  const extendTrial = async (row) => {
    const raw = window.prompt(t('admin.extendTrialPrompt'), '14')
    if (raw == null) return
    const days = Number.parseInt(String(raw).trim(), 10)
    if (!Number.isFinite(days) || days <= 0) return
    const reason = window.prompt(t('admin.extendTrialReasonPrompt'), '')
    if (reason == null || !reason.trim()) return
    await patchPlan(row, { extendTrialDays: days, reason: reason.trim() })
  }

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
      await loadSyncRuns()
    } catch {
      setError(t('admin.partnerSyncError'))
    } finally {
      setPartnerSyncLoading(false)
    }
  }

  const marketplaceReports = reports.filter((r) => r.targetType === 'marketplace_listing')
  const otherReports = reports.filter((r) => r.targetType !== 'marketplace_listing')

  return (
    <>
      <h2 className="h5 mb-2">{t('admin.titleMarketplace')}</h2>
      <p className="small text-muted mb-3">{t('admin.marketplacePageBlurb')}</p>

      <div className="alert alert-secondary small py-2 mb-3" role="note">
        <strong>{t('admin.marketplaceTwoModelsTitle')}</strong>
        <ul className="mb-0 ps-3 mt-1">
          <li>{t('admin.marketplaceTwoModelsVendorTier')}</li>
          <li>{t('admin.marketplaceTwoModelsOfficial')}</li>
        </ul>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}
      {partnerSyncMessage && <div className="alert alert-success small py-2">{partnerSyncMessage}</div>}

      <section className="card p-3 mb-4 border-primary">
        <h3 className="h6 mb-2">{t('admin.marketplaceSellersTitle')}</h3>
        <p className="small text-muted mb-3">{t('admin.marketplaceSellersBlurb')}</p>
        <div className="d-flex flex-wrap gap-2 align-items-end mb-3">
          <div className="flex-grow-1" style={{ minWidth: 200 }}>
            <label className="form-label small mb-0" htmlFor="mp-seller-q">
              {t('admin.marketplaceSellerSearchLabel')}
            </label>
            <input
              id="mp-seller-q"
              type="search"
              className="form-control form-control-sm"
              placeholder={t('admin.marketplaceSellerSearchPlaceholder')}
              value={sellerQuery}
              onChange={(e) => setSellerQuery(e.target.value)}
            />
          </div>
          <div className="form-check mb-1">
            <input
              className="form-check-input"
              type="checkbox"
              id="mp-vendors-only"
              checked={vendorsOnly}
              onChange={(e) => setVendorsOnly(e.target.checked)}
            />
            <label className="form-check-label small" htmlFor="mp-vendors-only">
              {t('admin.marketplaceVendorsOnlyFilter')}
            </label>
          </div>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => loadSellers()}>
            {t('common.search')}
          </button>
        </div>

        {sellersLoading ? (
          <p className="text-muted small mb-0">{t('common.loading')}</p>
        ) : sellers.length === 0 ? (
          <p className="text-muted small mb-0">{t('admin.marketplaceSellersEmpty')}</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>{t('auth.email')}</th>
                  <th>{t('admin.marketplaceColStorefront')}</th>
                  <th>{t('admin.plan')}</th>
                  <th>{t('admin.marketplaceColSellerTier')}</th>
                  <th>{t('admin.marketplaceColListings')}</th>
                  <th>{t('admin.marketplaceColVendor')}</th>
                  <th>{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sellers.map((row) => {
                  const tier = row.sellerProgram?.tier || sellerTierKey(row)
                  const limit = row.sellerProgram?.activeListingLimit ?? 5
                  const active = Number(row.activeListingsCount ?? 0)
                  const handle = row.publicHandle?.trim()
                  return (
                    <tr key={row.id}>
                      <td>
                        <div className="fw-semibold">{row.email}</div>
                        <div className="small text-muted d-block">{row.displayName || '—'}</div>
                      </td>
                      <td>
                        {handle ? (
                          <Link to={`/shop/${encodeURIComponent(handle)}`} target="_blank" rel="noreferrer">
                            {row.storefrontName || `@${handle}`}
                          </Link>
                        ) : (
                          <span className="text-muted small">{t('admin.marketplaceNoHandle')}</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge text-bg-${adminPlanBadgeClass(row)}`}>
                          {formatAdminPlanSummary(row, t)}
                        </span>
                      </td>
                      <td>
                        <span className="badge text-bg-dark">{t(`admin.marketplaceTier.${tier}`)}</span>
                        <div className="small text-muted d-block">
                          {active}/{limit} {t('admin.activeListingsShort')}
                        </div>
                      </td>
                      <td className="font-monospace small">
                        {active} / {row.totalListingsCount ?? 0}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`btn btn-sm ${row.verifiedBreeder ? 'btn-success' : 'btn-outline-success'}`}
                          disabled={vendorBusyId === row.id}
                          onClick={() => toggleVerifiedBreeder(row)}
                        >
                          {vendorBusyId === row.id
                            ? t('common.loading')
                            : row.verifiedBreeder
                              ? t('admin.marketplaceVendorOn')
                              : t('admin.marketplaceMakeVendor')}
                        </button>
                        {row.verifiedBreederAt && (
                          <div className="small text-muted d-block mt-1" style={{ fontSize: '0.7rem' }}>
                            {new Date(row.verifiedBreederAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="d-flex flex-column gap-1" style={{ minWidth: 140 }}>
                          <Link to="/marketplace/sell" className="btn btn-sm btn-outline-dark">
                            {t('admin.marketplaceOpenSellHub')}
                          </Link>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            disabled={planBusyId === row.id}
                            onClick={() => patchPlan(row, { plan: 'PRO' })}
                          >
                            {t('admin.grantPro')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            disabled={planBusyId === row.id}
                            onClick={() => patchPlan(row, { plan: 'FREE' })}
                          >
                            {t('admin.setFree')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-info"
                            disabled={planBusyId === row.id}
                            onClick={() => extendTrial(row)}
                          >
                            {t('admin.extendTrial')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="small text-muted mt-2 mb-0">
          {t('admin.marketplaceVendorEmailHint')}{' '}
          <code>docs/beta/vendor-welcome-email-template-es-2026-05-15.md</code>
        </p>
      </section>

      <section className="card p-3 mb-4">
        <h3 className="h6 mb-3">{t('admin.vendorVerificationTitle', { defaultValue: 'Vendor verification queue' })}</h3>
        {vendorVerifications.length === 0 ? (
          <p className="small text-muted mb-0">{t('admin.vendorVerificationEmpty', { defaultValue: 'No pending submissions.' })}</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm mb-0">
              <thead>
                <tr>
                  <th>{t('admin.vendorVerificationColUser', { defaultValue: 'User' })}</th>
                  <th>{t('admin.created', { defaultValue: 'Created' })}</th>
                  <th>{t('admin.officialLeadsColActions', { defaultValue: 'Actions' })}</th>
                </tr>
              </thead>
              <tbody>
                {vendorVerifications.map((row) => (
                  <tr key={row.id}>
                    <td className="small">
                      <div>{row.userEmail}</div>
                      <a href={row.selfieMediaUrl} target="_blank" rel="noreferrer" className="small">
                        {t('admin.vendorVerificationMedia', { defaultValue: 'Media' })}
                      </a>
                    </td>
                    <td className="small">{row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}</td>
                    <td className="d-flex gap-1">
                      <button
                        type="button"
                        className="btn btn-sm btn-success"
                        disabled={verificationBusyId === row.id}
                        onClick={async () => {
                          setVerificationBusyId(row.id)
                          try {
                            await adminService.reviewVendorVerification(row.id, { status: 'approved' })
                            setVendorVerifications((prev) => prev.filter((v) => v.id !== row.id))
                            setSuccess(t('admin.vendorVerificationStorefrontApproved', { defaultValue: 'Verified Shop badge granted (not vendor activation).' }))
                          } catch {
                            setError(t('admin.loadError'))
                          } finally {
                            setVerificationBusyId(null)
                          }
                        }}
                      >
                        {t('admin.vendorVerificationApprove', { defaultValue: 'Approve' })}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        disabled={verificationBusyId === row.id}
                        onClick={async () => {
                          setVerificationBusyId(row.id)
                          try {
                            await adminService.reviewVendorVerification(row.id, { status: 'rejected' })
                            setVendorVerifications((prev) => prev.filter((v) => v.id !== row.id))
                          } catch {
                            setError(t('admin.loadError'))
                          } finally {
                            setVerificationBusyId(null)
                          }
                        }}
                      >
                        {t('admin.vendorVerificationReject', { defaultValue: 'Reject' })}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => loadSyncRuns()}>
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
                  <th>{t('admin.created')}</th>
                </tr>
              </thead>
              <tbody>
                {syncRuns.slice(0, 12).map((run) => (
                  <tr key={run.id}>
                    <td className="small font-monospace">{String(run.officialVendorId || '').slice(0, 8)}…</td>
                    <td className="small">{run.status || '—'}</td>
                    <td className="small">{run.startedAt ? new Date(run.startedAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card p-3 mb-4">
        <h3 className="h6 mb-3">{t('admin.officialVendorsTitle')}</h3>
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
                  <th>{t('admin.partnerOpsCol', { defaultValue: 'Ops (30d)' })}</th>
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
                      <div className="small d-flex flex-wrap gap-1 mt-1">
                        <span className="badge text-bg-warning text-dark">{v.badge || (v.isFoundingPartner ? 'Founding partner' : 'Official partner')}</span>
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
                              defaultValue: 'Handoffs: {{count}}',
                              count: v.opsSummary.handoffs30d ?? 0,
                            })}
                          </div>
                          {v.opsSummary.latestSync ? (
                            <div className="text-muted">
                              {t('admin.partnerOpsSync', {
                                defaultValue: 'Sync: {{status}} · {{upserted}}/{{processed}}',
                                status: v.opsSummary.latestSync.status || '—',
                                upserted: v.opsSummary.latestSync.upsertedCount ?? 0,
                                processed: v.opsSummary.latestSync.processedCount ?? 0,
                              })}
                              {(v.opsSummary.latestSync.staleCount ?? 0) > 0
                                ? ` · stale ${v.opsSummary.latestSync.staleCount}`
                                : ''}
                            </div>
                          ) : (
                            <div className="text-muted">{t('admin.partnerOpsNoSync', { defaultValue: 'No sync runs yet' })}</div>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{v.enabled ? t('admin.officialVendorsActive') : t('admin.officialVendorsHidden')}</td>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={v.isFoundingPartner || v.partnerProgramTier === 'FOUNDING_PARTNER' || v.partnerProgramTier === 'STRATEGIC_FOUNDER'}
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
                      <div className="d-flex flex-column gap-1">
                        <button
                          type="button"
                          className={`btn btn-sm ${v.enabled ? 'btn-outline-danger' : 'btn-outline-success'}`}
                          onClick={() => toggleOfficialVendor(v.id, !v.enabled)}
                        >
                          {v.enabled ? t('admin.officialVendorsDeactivate') : t('admin.officialVendorsActivate')}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-dark"
                          disabled={partnerConfigBusyId === v.id}
                          onClick={() => editOfficialVendorConfig(v)}
                        >
                          {partnerConfigBusyId === v.id ? t('common.loading') : t('admin.partnerEditConfig', { defaultValue: 'Edit badge/feed' })}
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

      <section className="card p-3 mb-4">
        <h3 className="h6 mb-2">{t('admin.marketplaceModerationTitle')}</h3>
        <p className="small text-muted mb-3">{t('admin.marketplaceModerationBlurb')}</p>
        {marketplaceReports.length === 0 && otherReports.length === 0 ? (
          <p className="text-muted small mb-0">{t('admin.noReports')}</p>
        ) : (
          <>
            {marketplaceReports.length > 0 && (
              <>
                <h4 className="small fw-bold text-uppercase text-muted mb-2">{t('admin.marketplaceReportsListings')}</h4>
                <ReportTable rows={marketplaceReports} onResolve={resolveReport} hideActionForReport={hideActionForReport} t={t} />
              </>
            )}
            {otherReports.length > 0 && (
              <>
                <h4 className="small fw-bold text-uppercase text-muted mb-2 mt-3">{t('admin.marketplaceReportsOther')}</h4>
                <ReportTable rows={otherReports} onResolve={resolveReport} hideActionForReport={hideActionForReport} t={t} />
              </>
            )}
          </>
        )}
      </section>
    </>
  )
}

function ReportTable({ rows, onResolve, hideActionForReport, t }) {
  return (
    <div className="table-responsive">
      <table className="table table-sm align-middle mb-0">
        <thead>
          <tr>
            <th>{t('admin.target')}</th>
            <th>{t('admin.targetType')}</th>
            <th>{t('admin.reason')}</th>
            <th>{t('admin.created')}</th>
            <th>{t('admin.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="small">{r.targetRef || r.targetId || '-'}</td>
              <td className="text-muted small">{r.targetType || '-'}</td>
              <td>{r.reason}</td>
              <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</td>
              <td className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => onResolve(r.id, hideActionForReport(r))}
                >
                  {t('admin.hidePublic')}
                </button>
                <button type="button" className="btn btn-sm btn-outline-light" onClick={() => onResolve(r.id, 'dismiss')}>
                  {t('admin.dismiss')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
