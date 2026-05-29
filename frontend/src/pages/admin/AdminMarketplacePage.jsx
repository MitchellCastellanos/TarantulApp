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
  const [vendorVerifications, setVendorVerifications] = useState([])
  const [verificationBusyId, setVerificationBusyId] = useState(null)
  const [storefrontBusyId, setStorefrontBusyId] = useState(null)

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
      adminService.vendorVerifications('pending').catch(() => []),
    ])
      .then(([openReports, verifications]) => {
        if (cancelled) return
        setReports(Array.isArray(openReports) ? openReports : [])
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

  const toggleStorefrontVerified = async (row, next) => {
    setStorefrontBusyId(row.id)
    setError('')
    try {
      const updated = await adminService.setUserStorefrontVerified(row.id, next)
      setSellers((prev) =>
        prev.map((s) =>
          String(s.id) === String(row.id)
            ? {
                ...s,
                storefrontVerified: !!updated?.storefrontVerified,
                storefrontVerifiedAt: updated?.storefrontVerifiedAt ?? null,
              }
            : s,
        ),
      )
      setSuccess(next ? t('admin.storefrontVerifiedOn') : t('admin.storefrontVerifiedOff'))
    } catch {
      setError(t('admin.resolveError'))
    } finally {
      setStorefrontBusyId(null)
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

      <section className="card p-3 mb-4 border-warning">
        <h3 className="h6 mb-2">{t('admin.marketplacePartnersMovedTitle')}</h3>
        <p className="small text-muted mb-3">{t('admin.marketplacePartnersMovedBlurb')}</p>
        <Link to="/admin/partners" className="btn btn-sm btn-dark">
          {t('admin.navPartners')}
        </Link>
      </section>

      <section className="card p-3 mb-4 border-dark" id="badges-hub">
        <h3 className="h6 mb-2">{t('admin.badgesHubTitle')}</h3>
        <p className="small text-muted mb-3">{t('admin.badgesHubBlurb')}</p>
        <div className="row g-2 small">
          <div className="col-md-4">
            <div className="border rounded p-2 h-100">
              <strong>{t('admin.badgesHubVerifiedShop')}</strong>
              <p className="text-muted mb-2">{t('admin.badgesHubVerifiedShopHint')}</p>
              <a href="#badges-verification" className="btn btn-sm btn-outline-success">
                {t('admin.badgesHubGoVerification')}
              </a>
            </div>
          </div>
          <div className="col-md-4">
            <div className="border rounded p-2 h-100">
              <strong>{t('admin.badgesHubVendor')}</strong>
              <p className="text-muted mb-2">{t('admin.badgesHubVendorHint')}</p>
              <a href="#badges-sellers" className="btn btn-sm btn-outline-dark">
                {t('admin.badgesHubGoSellers')}
              </a>
            </div>
          </div>
          <div className="col-md-4">
            <div className="border rounded p-2 h-100">
              <strong>{t('admin.badgesHubPartner')}</strong>
              <p className="text-muted mb-2">{t('admin.badgesHubPartnerHint')}</p>
              <Link to="/admin/partners" className="btn btn-sm btn-outline-warning">
                {t('admin.badgesHubGoPartners')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="card p-3 mb-4" id="badges-verification">
        <h3 className="h6 mb-3">{t('admin.vendorVerificationTitle')}</h3>
        {vendorVerifications.length === 0 ? (
          <p className="small text-muted mb-0">{t('admin.vendorVerificationEmpty')}</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm mb-0">
              <thead>
                <tr>
                  <th>{t('admin.vendorVerificationColUser')}</th>
                  <th>{t('admin.created')}</th>
                  <th>{t('admin.officialLeadsColActions')}</th>
                </tr>
              </thead>
              <tbody>
                {vendorVerifications.map((row) => (
                  <tr key={row.id}>
                    <td className="small">
                      <div>{row.userEmail}</div>
                      <div className="text-muted">{row.userDisplayName || '—'}</div>
                      <div className="d-flex flex-wrap gap-2 mt-1">
                        {row.selfieMediaUrl ? (
                          <a href={row.selfieMediaUrl} target="_blank" rel="noreferrer" className="small">
                            {t('admin.vendorVerificationSelfie')}
                          </a>
                        ) : null}
                        {row.inventoryMediaUrl ? (
                          <a href={row.inventoryMediaUrl} target="_blank" rel="noreferrer" className="small">
                            {t('admin.vendorVerificationInventory')}
                          </a>
                        ) : null}
                        {row.paperMediaUrl ? (
                          <a href={row.paperMediaUrl} target="_blank" rel="noreferrer" className="small">
                            {t('admin.vendorVerificationPaper')}
                          </a>
                        ) : null}
                      </div>
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
                            setSuccess(t('admin.vendorVerificationStorefrontApproved'))
                          } catch {
                            setError(t('admin.loadError'))
                          } finally {
                            setVerificationBusyId(null)
                          }
                        }}
                      >
                        {t('admin.vendorVerificationApprove')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        disabled={verificationBusyId === row.id}
                        onClick={async () => {
                          const note = window.prompt(t('admin.vendorVerificationRejectPrompt'), '')
                          if (note === null) return
                          setVerificationBusyId(row.id)
                          try {
                            await adminService.reviewVendorVerification(row.id, {
                              status: 'rejected',
                              reviewerNote: note.trim() || undefined,
                            })
                            setVendorVerifications((prev) => prev.filter((v) => v.id !== row.id))
                            setSuccess(t('admin.vendorVerificationRejected'))
                          } catch {
                            setError(t('admin.loadError'))
                          } finally {
                            setVerificationBusyId(null)
                          }
                        }}
                      >
                        {t('admin.vendorVerificationReject')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card p-3 mb-4 border-primary" id="badges-sellers">
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
                  <th>{t('admin.marketplaceColVerifiedShop')}</th>
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
                        {row.verifiedBreeder ? (
                          <button
                            type="button"
                            className={`btn btn-sm ${row.storefrontVerified ? 'btn-success' : 'btn-outline-success'}`}
                            disabled={storefrontBusyId === row.id}
                            onClick={() => toggleStorefrontVerified(row, !row.storefrontVerified)}
                          >
                            {storefrontBusyId === row.id
                              ? t('common.loading')
                              : row.storefrontVerified
                                ? t('admin.storefrontVerifiedBadge')
                                : t('admin.marketplaceGrantVerifiedShop')}
                          </button>
                        ) : (
                          <span className="small text-muted">—</span>
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
