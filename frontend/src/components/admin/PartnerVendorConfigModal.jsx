import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isFoundingPartnerTier } from '../../utils/partnerProgramTier'
import LogoUploader from '../LogoUploader'
import adminService from '../../services/adminService'

const DEFAULT_WOO_FEED_JSON = `{
  "allowedCategories": ["tarantulas", "terrariums", "substrates", "live_food", "supplies"],
  "cartHandoffMode": "woocommerce"
}`

const DEFAULT_CSV_FEED_JSON = `{
  "feedUrl": "",
  "csvDelimiter": ",",
  "allowedCategories": ["tarantulas", "terrariums", "substrates", "live_food", "supplies"],
  "categoryMapping": {}
}`

export default function PartnerVendorConfigModal({ vendor, busy, onClose, onSave }) {
  const { t } = useTranslation()
  const [tier, setTier] = useState('official')
  const [badge, setBadge] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [feedBaseUrl, setFeedBaseUrl] = useState('')
  const [feedType, setFeedType] = useState('')
  const [feedConfigJson, setFeedConfigJson] = useState(DEFAULT_WOO_FEED_JSON)
  const [jsonError, setJsonError] = useState('')
  // Integrated cart (add-to-cart + cart bar handoff). When off, each listing links
  // directly to its own product page on the partner website.
  const [cartEnabled, setCartEnabled] = useState(true)
  // In-app TarantulApp checkout (beta, Canada only).
  const [inAppEnabled, setInAppEnabled] = useState(false)
  const [checkoutMode, setCheckoutMode] = useState('website')
  const [payoutMode, setPayoutMode] = useState('platform')
  const [commissionPercent, setCommissionPercent] = useState('0')
  const [commissionWaived, setCommissionWaived] = useState(false)
  const [stripeAccountId, setStripeAccountId] = useState('')
  const [pickupConfig, setPickupConfig] = useState(null)
  const [assignedPickupIds, setAssignedPickupIds] = useState([])
  const [defaultPickupId, setDefaultPickupId] = useState('')
  const [listingPickupIds, setListingPickupIds] = useState({})

  const inAppCountryOk = !!vendor?.checkout?.inAppCheckoutCountry

  useEffect(() => {
    if (!vendor) return
    setTier(isFoundingPartnerTier(vendor) ? 'founding' : 'official')
    setBadge(vendor.badge || (isFoundingPartnerTier(vendor) ? 'Founding partner' : 'Official partner'))
    setWebsiteUrl(vendor.websiteUrl || '')
    setFeedBaseUrl(vendor.feedBaseUrl || vendor.websiteUrl || '')
    setFeedType(vendor.feedType || '')
    const fc = vendor.feedConfig && Object.keys(vendor.feedConfig).length > 0 ? vendor.feedConfig : null
    setFeedConfigJson(fc ? JSON.stringify(fc, null, 2) : defaultFeedJsonForType(vendor.feedType))
    setJsonError('')
    const cartOff = vendor.feedConfig?.cartEnabled === false
      || String(vendor.feedConfig?.cartHandoffMode || '').toLowerCase() === 'none'
    setCartEnabled(!cartOff)
    const inApp = (vendor.feedConfig && vendor.feedConfig.inAppCheckout) || {}
    setInAppEnabled(!!inApp.enabled)
    setCheckoutMode(vendor.feedConfig?.checkoutMode === 'tarantulapp' ? 'tarantulapp' : 'website')
    setPayoutMode(inApp.payoutMode === 'connect' ? 'connect' : 'platform')
    setCommissionPercent(String(inApp.commissionPercent ?? 0))
    setCommissionWaived(!!inApp.commissionWaived)
    setStripeAccountId(inApp.stripeAccountId || '')
    setPickupConfig(null)
    setAssignedPickupIds([])
    setDefaultPickupId('')
    setListingPickupIds({})
    adminService.officialVendorPickupPoints(vendor.id)
      .then((cfg) => {
        setPickupConfig(cfg)
        const ids = Array.isArray(cfg?.assignedPickupPointIds) ? cfg.assignedPickupPointIds.map(String) : []
        setAssignedPickupIds(ids)
        setDefaultPickupId(cfg?.defaultPickupPointId ? String(cfg.defaultPickupPointId) : '')
        const listingMap = {}
        ;(Array.isArray(cfg?.activeListings) ? cfg.activeListings : []).forEach((listing) => {
          listingMap[String(listing.id)] = Array.isArray(listing.pickupPointIds)
            ? listing.pickupPointIds.map(String)
            : []
        })
        setListingPickupIds(listingMap)
      })
      .catch(() => setPickupConfig(null))
  }, [vendor])

  if (!vendor) return null

  const onFeedTypeChange = (next) => {
    setFeedType(next)
    if (next === 'csv' && feedConfigJson.trim() === DEFAULT_WOO_FEED_JSON.trim()) {
      setFeedConfigJson(DEFAULT_CSV_FEED_JSON)
    }
    if (next === 'woocommerce' && feedConfigJson.trim() === DEFAULT_CSV_FEED_JSON.trim()) {
      setFeedConfigJson(DEFAULT_WOO_FEED_JSON)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setJsonError('')
    let feedConfig
    try {
      feedConfig = JSON.parse(feedConfigJson)
    } catch {
      setJsonError(t('admin.partnerFeedConfigJsonInvalid'))
      return
    }
    const isFounding = tier === 'founding'
    // In-app checkout is Canada-only; never persist it enabled for ineligible vendors.
    const inApp = {
      enabled: inAppCountryOk && inAppEnabled,
      payoutMode,
      stripeAccountId: stripeAccountId.trim(),
      commissionPercent: Number(commissionPercent) || 0,
      commissionWaived,
      providers: ['stripe', 'paypal', 'klarna'],
    }
    if (pickupConfig) {
      await adminService.setOfficialVendorPickupPoints(vendor.id, {
        pickupPointIds: assignedPickupIds,
        defaultPickupPointId: assignedPickupIds.includes(defaultPickupId) ? defaultPickupId : null,
      })
      await Promise.all(Object.entries(listingPickupIds).map(([listingId, ids]) =>
        adminService.setPartnerListingPickupPoints(listingId, {
          pickupPointIds: (ids || []).filter((id) => assignedPickupIds.includes(id)),
        }),
      ))
    }
    onSave({
      partnerProgramTier: isFounding ? 'FOUNDING_PARTNER' : 'OFFICIAL_PARTNER',
      strategicFounder: isFounding,
      badge: badge.trim(),
      websiteUrl: websiteUrl.trim(),
      feedBaseUrl: feedBaseUrl.trim(),
      feedType: feedType.trim() || null,
      feedConfig: {
        ...feedConfig,
        partnerTier: isFounding ? 'founding' : 'official',
        boostLevel: isFounding ? 2 : 1,
        cartEnabled,
        checkoutMode: inAppCountryOk && inAppEnabled ? checkoutMode : 'website',
        inAppCheckout: inApp,
      },
    })
  }

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} role="dialog">
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <form className="modal-content" onSubmit={handleSubmit}>
          <div className="modal-header">
            <h3 className="modal-title h6">{t('admin.partnerConfigModalTitle', { name: vendor.name })}</h3>
            <button type="button" className="btn-close" onClick={onClose} aria-label={t('common.close')} />
          </div>
          <div className="modal-body">
            <div className="row g-2">
              <div className="col-md-4">
                <label className="form-label small">{t('admin.officialVendorsColTier')}</label>
                <select className="form-select form-select-sm" value={tier} onChange={(e) => setTier(e.target.value)}>
                  <option value="official">{t('admin.partnerTierOfficial')}</option>
                  <option value="founding">{t('admin.partnerTierFounding')}</option>
                </select>
              </div>
              <div className="col-md-8">
                <label className="form-label small">{t('admin.officialVendorsColBadge')}</label>
                <input className="form-control form-control-sm" value={badge} onChange={(e) => setBadge(e.target.value)} />
              </div>
              <div className="col-12">
                <label className="form-label small">{t('admin.partnerWebsitePrompt')}</label>
                <input className="form-control form-control-sm" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
              </div>
              <div className="col-md-8">
                <label className="form-label small">{t('admin.partnerFeedBaseUrlPrompt')}</label>
                <input className="form-control form-control-sm" value={feedBaseUrl} onChange={(e) => setFeedBaseUrl(e.target.value)} />
              </div>
              <div className="col-md-4">
                <label className="form-label small">{t('admin.partnerFeedTypePrompt')}</label>
                <select
                  className="form-select form-select-sm"
                  value={feedType}
                  onChange={(e) => onFeedTypeChange(e.target.value)}
                >
                  <option value="">{t('admin.partnerFeedTypeNone')}</option>
                  <option value="woocommerce">woocommerce</option>
                  <option value="csv">csv</option>
                  <option value="static">static</option>
                  <option value="shopify">shopify</option>
                  <option value="lightspeed">lightspeed</option>
                </select>
              </div>
              <div className="col-12">
                <label className="form-label small">{t('admin.partnerFeedConfigJsonLabel')}</label>
                <textarea
                  className={`form-control form-control-sm font-monospace${jsonError ? ' is-invalid' : ''}`}
                  rows={10}
                  value={feedConfigJson}
                  onChange={(e) => setFeedConfigJson(e.target.value)}
                />
                {jsonError ? <div className="invalid-feedback d-block">{jsonError}</div> : null}
                <p className="small text-muted mb-0 mt-1">{t('admin.partnerFeedConfigJsonHint')}</p>
                <p className="small text-muted mb-0">{t('admin.partnerFeedSyncOptionalHint')}</p>
              </div>
              <div className="col-12">
                <hr className="my-2" />
                <div className="form-check ms-2">
                  <input className="form-check-input" type="checkbox" id="cartEnabled"
                    checked={cartEnabled} onChange={(e) => setCartEnabled(e.target.checked)} />
                  <label className="form-check-label small" htmlFor="cartEnabled">
                    {t('admin.partnerCartEnabledLabel')}
                  </label>
                </div>
                <p className="small text-muted mb-0 mt-1">{t('admin.partnerCartEnabledHint')}</p>
              </div>
              <div className="col-12">
                <hr className="my-2" />
                <h4 className="h6 mb-1">{t('admin.partnerCheckoutSection')}</h4>
                {inAppCountryOk ? (
                  <div className="row g-2">
                    <div className="col-12 form-check ms-2">
                      <input className="form-check-input" type="checkbox" id="inAppEnabled"
                        checked={inAppEnabled} onChange={(e) => setInAppEnabled(e.target.checked)} />
                      <label className="form-check-label small" htmlFor="inAppEnabled">
                        {t('admin.partnerInAppEnableLabel')}
                      </label>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small">{t('admin.partnerCheckoutModeLabel')}</label>
                      <select className="form-select form-select-sm" value={checkoutMode}
                        disabled={!inAppEnabled} onChange={(e) => setCheckoutMode(e.target.value)}>
                        <option value="website">{t('admin.partnerCheckoutModeWebsite')}</option>
                        <option value="tarantulapp">{t('admin.partnerCheckoutModeInApp')}</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small">{t('admin.partnerPayoutModeLabel')}</label>
                      <select className="form-select form-select-sm" value={payoutMode}
                        disabled={!inAppEnabled} onChange={(e) => setPayoutMode(e.target.value)}>
                        <option value="platform">{t('admin.partnerPayoutPlatform')}</option>
                        <option value="connect">{t('admin.partnerPayoutConnect')}</option>
                      </select>
                    </div>
                    {payoutMode === 'connect' && (
                      <div className="col-12">
                        <label className="form-label small">{t('admin.partnerStripeAccountLabel')}</label>
                        <input className="form-control form-control-sm" value={stripeAccountId}
                          placeholder="acct_..." disabled={!inAppEnabled}
                          onChange={(e) => setStripeAccountId(e.target.value)} />
                      </div>
                    )}
                    <div className="col-md-6">
                      <label className="form-label small">{t('admin.partnerCommissionPercentLabel')}</label>
                      <input className="form-control form-control-sm" type="number" min="0" max="100" step="0.1"
                        value={commissionPercent} disabled={!inAppEnabled}
                        onChange={(e) => setCommissionPercent(e.target.value)} />
                    </div>
                    <div className="col-md-6 d-flex align-items-end">
                      <div className="form-check ms-1 mb-1">
                        <input className="form-check-input" type="checkbox" id="commissionWaived"
                          checked={commissionWaived} disabled={!inAppEnabled}
                          onChange={(e) => setCommissionWaived(e.target.checked)} />
                        <label className="form-check-label small" htmlFor="commissionWaived">
                          {t('admin.partnerCommissionWaivedLabel')}
                        </label>
                      </div>
                    </div>
                    <p className="small text-muted mb-0">{t('admin.partnerCheckoutHint')}</p>
                  </div>
                ) : (
                  <p className="small text-muted mb-0">{t('admin.partnerInAppCanadaOnly')}</p>
                )}
              </div>
              <div className="col-12">
                <hr className="my-2" />
                <h4 className="h6 mb-1">{t('admin.pickupPartnerSection')}</h4>
                <p className="small text-muted mb-2">
                  {pickupConfig?.pickupAuthorized ? t('admin.pickupPartnerAuthorized') : t('admin.pickupPartnerNeedsAuthorization')}
                </p>
                {Array.isArray(pickupConfig?.pickupPoints) && pickupConfig.pickupPoints.length > 0 ? (
                  <div className="row g-2">
                    {pickupConfig.pickupPoints.map((point) => {
                      const checked = assignedPickupIds.includes(String(point.id))
                      return (
                        <div className="col-md-6" key={point.id}>
                          <div className="border rounded p-2 h-100">
                            <div className="form-check">
                              <input
                                id={`pickup-${point.id}`}
                                className="form-check-input"
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const id = String(point.id)
                                  setAssignedPickupIds((prev) =>
                                    e.target.checked ? [...new Set([...prev, id])] : prev.filter((v) => v !== id),
                                  )
                                  if (!e.target.checked && defaultPickupId === id) setDefaultPickupId('')
                                }}
                              />
                              <label className="form-check-label small fw-semibold" htmlFor={`pickup-${point.id}`}>
                                {point.name}
                              </label>
                            </div>
                            <div className="small text-muted">
                              {[point.city, point.state, point.country].filter(Boolean).join(' · ')}
                              {' · '}
                              {t('marketplace.partnerCartPickupHoldDays', { count: point.holdDays || 3 })}
                            </div>
                            {checked && (
                              <div className="form-check mt-1">
                                <input
                                  id={`pickup-default-${point.id}`}
                                  className="form-check-input"
                                  type="radio"
                                  name="defaultPickup"
                                  checked={defaultPickupId === String(point.id)}
                                  onChange={() => setDefaultPickupId(String(point.id))}
                                />
                                <label className="form-check-label small" htmlFor={`pickup-default-${point.id}`}>
                                  {t('admin.pickupPartnerDefault')}
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="small text-muted mb-0">{t('admin.pickupPointsEmpty')}</p>
                )}
                {Array.isArray(pickupConfig?.activeListings) && pickupConfig.activeListings.length > 0 && assignedPickupIds.length > 0 ? (
                  <div className="mt-3">
                    <h5 className="small fw-semibold mb-2">{t('admin.pickupListingSection')}</h5>
                    <div className="border rounded" style={{ maxHeight: 220, overflowY: 'auto' }}>
                      {pickupConfig.activeListings.map((listing) => (
                        <div className="p-2 border-bottom" key={listing.id}>
                          <div className="small fw-semibold">{listing.title || listing.externalId}</div>
                          <div className="d-flex flex-wrap gap-3 mt-1">
                            {pickupConfig.pickupPoints
                              .filter((point) => assignedPickupIds.includes(String(point.id)))
                              .map((point) => {
                                const listingId = String(listing.id)
                                const pointId = String(point.id)
                                const checked = (listingPickupIds[listingId] || []).includes(pointId)
                                return (
                                  <div className="form-check" key={`${listing.id}:${point.id}`}>
                                    <input
                                      id={`listing-pickup-${listing.id}-${point.id}`}
                                      className="form-check-input"
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) => setListingPickupIds((prev) => {
                                        const current = prev[listingId] || []
                                        return {
                                          ...prev,
                                          [listingId]: e.target.checked
                                            ? [...new Set([...current, pointId])]
                                            : current.filter((id) => id !== pointId),
                                        }
                                      })}
                                    />
                                    <label className="form-check-label small" htmlFor={`listing-pickup-${listing.id}-${point.id}`}>
                                      {point.name}
                                    </label>
                                  </div>
                                )
                              })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="col-12">
                <LogoUploader
                  service={{
                    get: () => adminService.officialVendorBranding(vendor.id),
                    uploadLogo: (file) => adminService.uploadOfficialVendorLogo(vendor.id, file),
                    deleteLogo: () => adminService.deleteOfficialVendorLogo(vendor.id),
                  }}
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-sm btn-dark" disabled={busy}>
              {busy ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function defaultFeedJsonForType(type) {
  return type === 'csv' ? DEFAULT_CSV_FEED_JSON : DEFAULT_WOO_FEED_JSON
}
