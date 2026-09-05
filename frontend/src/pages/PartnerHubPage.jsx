import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import FangPanel from '../components/FangPanel'
import OfficialPartnerShield from '../components/OfficialPartnerShield'
import { useCapabilities } from '../hooks/useCapabilities'
import mePartnerService from '../services/mePartnerService'
import meBrandingService from '../services/meBrandingService'
import LogoUploader from '../components/LogoUploader'
import { isFoundingPartnerTier } from '../utils/partnerProgramTier'

export default function PartnerHubPage() {
  const { t } = useTranslation()
  const { data: capabilities, isLoading: capsLoading } = useCapabilities()
  const [hub, setHub] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingMode, setSavingMode] = useState(false)
  const [savingShipping, setSavingShipping] = useState(false)
  const [requestingFeature, setRequestingFeature] = useState('')
  const [orders, setOrders] = useState([])
  const [connecting, setConnecting] = useState(false)
  const [shippingForm, setShippingForm] = useState({
    inPersonCities: '',
    serviceArea: '',
    shippingMode: 'coordinate',
    flatRate: '',
    currency: 'CAD',
    notes: '',
  })

  useEffect(() => {
    if (!capabilities?.officialPartner) {
      setLoading(false)
      return
    }
    let cancelled = false
    mePartnerService
      .hub()
      .then((data) => {
        if (!cancelled) {
          setHub(data)
          const sp = data?.vendor?.shippingProfile || {}
          setShippingForm({
            inPersonCities: sp.inPersonCities || '',
            serviceArea: sp.serviceArea || '',
            shippingMode: sp.shippingMode || 'coordinate',
            flatRate: sp.flatRate || '',
            currency: sp.currency || (String(data?.vendor?.country || '').toLowerCase() === 'canada' ? 'CAD' : 'USD'),
            notes: sp.notes || '',
          })
        }
      })
      .catch(() => {
        if (!cancelled) setError(t('partnerHub.loadError'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [capabilities?.officialPartner, t])

  // Load in-app orders once we know this partner has in-app checkout enabled.
  useEffect(() => {
    if (!hub?.vendor?.checkout?.inAppEligible) return undefined
    let cancelled = false
    mePartnerService
      .orders()
      .then((data) => { if (!cancelled) setOrders(Array.isArray(data) ? data : []) })
      .catch(() => { if (!cancelled) setOrders([]) })
    return () => { cancelled = true }
  }, [hub?.vendor?.checkout?.inAppEligible])

  if (capsLoading || loading) {
    return (
      <div>
        <Navbar />
        <div className="container py-4"><p>{t('common.loading')}</p></div>
      </div>
    )
  }

  if (!capabilities?.officialPartner || !hub?.eligible) {
    return <Navigate to="/partners" replace />
  }

  const vendor = hub.vendor || {}
  const ops = vendor.opsSummary || {}
  const founding = isFoundingPartnerTier(vendor)
  const checkout = vendor.checkout || {}

  const changeCheckoutMode = async (mode) => {
    setSavingMode(true)
    setError('')
    try {
      const next = await mePartnerService.setCheckoutMode(mode)
      setHub(next)
    } catch {
      setError(t('partnerHub.checkoutModeError'))
    } finally {
      setSavingMode(false)
    }
  }

  const saveShippingProfile = async (e) => {
    e.preventDefault()
    setSavingShipping(true)
    setError('')
    try {
      const next = await mePartnerService.updateShippingProfile(shippingForm)
      setHub(next)
    } catch {
      setError(t('partnerHub.shippingSaveError'))
    } finally {
      setSavingShipping(false)
    }
  }

  const requestFeature = async (requestType) => {
    setRequestingFeature(requestType)
    setError('')
    try {
      const created = await mePartnerService.createFeatureRequest({
        requestType,
        message: requestType === 'pickup_point'
          ? t('partnerHub.pickupRequestMessage')
          : t('partnerHub.inAppRequestMessage'),
        payload: { shippingProfile: shippingForm },
      })
      setHub((prev) => ({
        ...prev,
        featureRequests: [created, ...(Array.isArray(prev?.featureRequests) ? prev.featureRequests : [])],
      }))
    } catch (err) {
      setError(err?.response?.data?.error || t('partnerHub.featureRequestError'))
    } finally {
      setRequestingFeature('')
    }
  }

  const startStripeConnect = async () => {
    setConnecting(true)
    setError('')
    try {
      const res = await mePartnerService.stripeConnectOnboard()
      if (res?.onboardingUrl) {
        window.location.assign(res.onboardingUrl)
        return
      }
      setError(t('partnerHub.stripeConnectError'))
    } catch {
      setError(t('partnerHub.stripeConnectError'))
    } finally {
      setConnecting(false)
    }
  }

  const fmt = (amount, currency) =>
    `${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency || ''}`.trim()

  return (
    <div>
      <Navbar />
      <div className="container py-4" style={{ maxWidth: 720 }}>
        <div className="d-flex align-items-start gap-2 mb-3">
          {founding && <OfficialPartnerShield width={28} height={30} />}
          <div>
            <h1 className="h4 mb-1">{t('partnerHub.title')}</h1>
            <p className="small text-muted mb-0">{vendor.name}</p>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="row g-2 mb-4">
          <div className="col-6 col-md-3">
            <FangPanel>
              <div className="small text-muted">{t('partnerHub.listings')}</div>
              <div className="fs-5 fw-bold">{vendor.activeListingCount ?? vendor.catalogTotal ?? 0}</div>
            </FangPanel>
          </div>
          <div className="col-6 col-md-3">
            <FangPanel>
              <div className="small text-muted">{t('partnerHub.handoffs30d')}</div>
              <div className="fs-5 fw-bold">{ops.handoffs30d ?? 0}</div>
            </FangPanel>
          </div>
        </div>

        {ops.latestSync && (
          <FangPanel className="mb-3">
            <h2 className="h6 mb-2">{t('partnerHub.syncTitle')}</h2>
            <p className="small mb-0">
              {t('partnerHub.syncSummary', {
                status: ops.latestSync.status || '—',
                upserted: ops.latestSync.upsertedCount ?? 0,
                processed: ops.latestSync.processedCount ?? 0,
              })}
            </p>
          </FangPanel>
        )}

        <FangPanel className="mb-3">
          <h2 className="h6 mb-2">{t('partnerHub.actionsTitle')}</h2>
          <div className="d-flex flex-wrap gap-2">
            {hub.storefrontPath && (
              <Link to={hub.storefrontPath} className="btn btn-sm btn-dark">
                {t('partnerHub.openStorefront')}
              </Link>
            )}
            {vendor.websiteUrl && (
              <a href={vendor.websiteUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary">
                {t('partnerHub.openWebsite')}
              </a>
            )}
            <Link to="/marketplace" className="btn btn-sm btn-outline-secondary">
              {t('partnerHub.viewMarketplace')}
            </Link>
          </div>
          <p className="small text-muted mt-3 mb-0">{t('partnerHub.adminSyncHint')}</p>
        </FangPanel>

        <FangPanel className="mb-3">
          <h2 className="h6 mb-2">{t('partnerHub.shippingTitle')}</h2>
          <p className="small text-muted mb-3">{t('partnerHub.shippingHint')}</p>
          <form onSubmit={saveShippingProfile}>
            <div className="row g-2">
              <div className="col-12">
                <label className="form-label small">{t('partnerHub.inPersonCities')}</label>
                <input
                  className="form-control form-control-sm"
                  value={shippingForm.inPersonCities}
                  onChange={(e) => setShippingForm((f) => ({ ...f, inPersonCities: e.target.value }))}
                  placeholder={t('partnerHub.inPersonCitiesPlaceholder')}
                />
              </div>
              <div className="col-12">
                <label className="form-label small">{t('partnerHub.serviceArea')}</label>
                <input
                  className="form-control form-control-sm"
                  value={shippingForm.serviceArea}
                  onChange={(e) => setShippingForm((f) => ({ ...f, serviceArea: e.target.value }))}
                  placeholder={t('partnerHub.serviceAreaPlaceholder')}
                />
              </div>
              <div className="col-md-5">
                <label className="form-label small">{t('partnerHub.shippingMode')}</label>
                <select
                  className="form-select form-select-sm"
                  value={shippingForm.shippingMode}
                  onChange={(e) => setShippingForm((f) => ({ ...f, shippingMode: e.target.value }))}
                >
                  <option value="coordinate">{t('partnerHub.shippingModeCoordinate')}</option>
                  <option value="flat">{t('partnerHub.shippingModeFlat')}</option>
                  <option value="none">{t('partnerHub.shippingModeNone')}</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label small">{t('partnerHub.flatRate')}</label>
                <input
                  className="form-control form-control-sm"
                  disabled={shippingForm.shippingMode !== 'flat'}
                  value={shippingForm.flatRate}
                  onChange={(e) => setShippingForm((f) => ({ ...f, flatRate: e.target.value }))}
                  placeholder="25.00"
                />
              </div>
              <div className="col-md-3">
                <label className="form-label small">{t('partnerHub.currency')}</label>
                <input
                  className="form-control form-control-sm"
                  value={shippingForm.currency}
                  onChange={(e) => setShippingForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
                />
              </div>
              <div className="col-12">
                <label className="form-label small">{t('partnerHub.shippingNotes')}</label>
                <textarea
                  className="form-control form-control-sm"
                  rows={2}
                  value={shippingForm.notes}
                  onChange={(e) => setShippingForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-sm btn-dark mt-3" disabled={savingShipping}>
              {savingShipping ? t('common.loading') : t('partnerHub.shippingSave')}
            </button>
          </form>
        </FangPanel>

        {checkout.inAppEligible && (
          <FangPanel className="mb-3">
            <h2 className="h6 mb-2">{t('partnerHub.checkoutModeTitle')}</h2>
            <p className="small text-muted mb-2">{t('partnerHub.checkoutModeHint')}</p>
            <div className="btn-group" role="group" aria-label={t('partnerHub.checkoutModeTitle')}>
              <button
                type="button"
                className={`btn btn-sm ${checkout.preferredMode === 'tarantulapp' ? 'btn-outline-secondary' : 'btn-dark'}`}
                disabled={savingMode}
                onClick={() => changeCheckoutMode('website')}
              >
                {t('partnerHub.checkoutModeWebsite')}
              </button>
              <button
                type="button"
                className={`btn btn-sm ${checkout.preferredMode === 'tarantulapp' ? 'btn-success' : 'btn-outline-secondary'}`}
                disabled={savingMode}
                onClick={() => changeCheckoutMode('tarantulapp')}
              >
                {t('partnerHub.checkoutModeInApp')}
              </button>
            </div>

            {checkout.payoutMode === 'connect' && (
              <div className="mt-3">
                <p className="small text-muted mb-2">{t('partnerHub.stripeConnectHint')}</p>
                {checkout.stripeAccountLinked ? (
                  <p className="small mb-2 text-success">{t('partnerHub.stripeConnectLinked')}</p>
                ) : null}
                <button type="button" className="btn btn-sm btn-outline-primary" disabled={connecting} onClick={startStripeConnect}>
                  {connecting
                    ? t('common.loading')
                    : checkout.stripeAccountLinked
                      ? t('partnerHub.stripeConnectManage')
                      : t('partnerHub.stripeConnectStart')}
                </button>
              </div>
            )}
          </FangPanel>
        )}

        <FangPanel className="mb-3">
          <h2 className="h6 mb-2">{t('partnerHub.requestsTitle')}</h2>
          <div className="d-flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              disabled={requestingFeature === 'pickup_point'}
              onClick={() => requestFeature('pickup_point')}
            >
              {requestingFeature === 'pickup_point' ? t('common.loading') : t('partnerHub.requestPickup')}
            </button>
            {String(vendor.country || '').toLowerCase() === 'canada' && !checkout.inAppEligible && (
              <button
                type="button"
                className="btn btn-sm btn-outline-success"
                disabled={requestingFeature === 'in_app_payments'}
                onClick={() => requestFeature('in_app_payments')}
              >
                {requestingFeature === 'in_app_payments' ? t('common.loading') : t('partnerHub.requestInAppPayments')}
              </button>
            )}
          </div>
          {Array.isArray(hub.featureRequests) && hub.featureRequests.length > 0 ? (
            <div className="list-group list-group-flush small">
              {hub.featureRequests.slice(0, 5).map((req) => (
                <div className="list-group-item px-0" key={req.id}>
                  <div className="d-flex justify-content-between gap-2">
                    <span className="fw-semibold">{t(`partnerHub.featureType.${req.requestType}`, { defaultValue: req.requestType })}</span>
                    <span className="badge text-bg-secondary">{t(`partnerHub.featureStatus.${req.status}`, { defaultValue: req.status })}</span>
                  </div>
                  {req.responseMessage ? <div className="text-muted mt-1">{req.responseMessage}</div> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="small text-muted mb-0">{t('partnerHub.requestsEmpty')}</p>
          )}
        </FangPanel>

        {checkout.inAppEligible && orders.length > 0 && (
          <FangPanel className="mb-3">
            <h2 className="h6 mb-2">{t('partnerHub.ordersTitle')}</h2>
            <div className="table-responsive">
              <table className="table table-sm small mb-0 align-middle">
                <thead>
                  <tr>
                    <th>{t('partnerHub.ordersColDate')}</th>
                    <th>{t('partnerHub.ordersColItems')}</th>
                    <th>{t('partnerHub.ordersColTotal')}</th>
                    <th>{t('partnerHub.ordersColPayout')}</th>
                    <th>{t('partnerHub.ordersColStatus')}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}</td>
                      <td>{o.itemCount}</td>
                      <td>{fmt(o.subtotal, o.currency)}</td>
                      <td>{o.payoutMode === 'platform' ? t('partnerHub.ordersPayoutPlatform') : fmt(o.partnerPayoutAmount, o.currency)}</td>
                      <td>
                        <span className={`badge ${o.status === 'paid' ? 'bg-success' : 'bg-secondary'}`}>{o.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FangPanel>
        )}

        {capabilities?.branding && (
          <FangPanel className="mt-3">
            <LogoUploader service={meBrandingService} />
          </FangPanel>
        )}
      </div>
    </div>
  )
}
