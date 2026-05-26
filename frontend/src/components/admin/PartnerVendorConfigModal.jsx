import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isFoundingPartnerTier } from '../../utils/partnerProgramTier'

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
  const [feedType, setFeedType] = useState('woocommerce')
  const [feedConfigJson, setFeedConfigJson] = useState(DEFAULT_WOO_FEED_JSON)
  const [jsonError, setJsonError] = useState('')

  useEffect(() => {
    if (!vendor) return
    setTier(isFoundingPartnerTier(vendor) ? 'founding' : 'official')
    setBadge(vendor.badge || (isFoundingPartnerTier(vendor) ? 'Founding partner' : 'Official partner'))
    setWebsiteUrl(vendor.websiteUrl || '')
    setFeedBaseUrl(vendor.feedBaseUrl || vendor.websiteUrl || '')
    setFeedType(vendor.feedType || 'woocommerce')
    const fc = vendor.feedConfig && Object.keys(vendor.feedConfig).length > 0 ? vendor.feedConfig : null
    setFeedConfigJson(fc ? JSON.stringify(fc, null, 2) : defaultFeedJsonForType(vendor.feedType))
    setJsonError('')
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
    onSave({
      partnerProgramTier: isFounding ? 'FOUNDING_PARTNER' : 'OFFICIAL_PARTNER',
      strategicFounder: isFounding,
      badge: badge.trim(),
      websiteUrl: websiteUrl.trim(),
      feedBaseUrl: feedBaseUrl.trim(),
      feedType: feedType.trim() || 'woocommerce',
      feedConfig: {
        ...feedConfig,
        partnerTier: isFounding ? 'founding' : 'official',
        boostLevel: isFounding ? 2 : 1,
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
