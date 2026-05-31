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
  // In-app TarantulApp checkout (beta, Canada only).
  const [inAppEnabled, setInAppEnabled] = useState(false)
  const [checkoutMode, setCheckoutMode] = useState('website')
  const [payoutMode, setPayoutMode] = useState('platform')
  const [commissionPercent, setCommissionPercent] = useState('0')
  const [commissionWaived, setCommissionWaived] = useState(false)
  const [stripeAccountId, setStripeAccountId] = useState('')

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
    const inApp = (vendor.feedConfig && vendor.feedConfig.inAppCheckout) || {}
    setInAppEnabled(!!inApp.enabled)
    setCheckoutMode(vendor.feedConfig?.checkoutMode === 'tarantulapp' ? 'tarantulapp' : 'website')
    setPayoutMode(inApp.payoutMode === 'connect' ? 'connect' : 'platform')
    setCommissionPercent(String(inApp.commissionPercent ?? 0))
    setCommissionWaived(!!inApp.commissionWaived)
    setStripeAccountId(inApp.stripeAccountId || '')
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

  const handleSubmit = (e) => {
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
