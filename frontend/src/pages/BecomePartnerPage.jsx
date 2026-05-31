import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import OfficialPartnerShield from '../components/OfficialPartnerShield'
import marketplaceService from '../services/marketplaceService'
import { STORE_COUNTRY_OPTIONS, STATES_BY_COUNTRY, CITIES_BY_STATE } from '../constants/locations'
import { usePageSeo } from '../hooks/usePageSeo'

const DELIVERY_SCOPE_OPTIONS = [
  { value: 'National', labelKey: 'marketplace.nationalShipping' },
  { value: 'Regional', labelKey: 'marketplace.regionalShipping' },
  { value: 'Local pickup', labelKey: 'marketplace.shippingLocal' },
]

const EMPTY_LEAD = {
  businessName: '',
  contactName: '',
  contactEmail: '',
  websiteUrl: '',
  country: 'Mexico',
  state: '',
  city: '',
  shippingScope: 'National',
  note: '',
}

export default function BecomePartnerPage() {
  const { t } = useTranslation()
  const [form, setForm] = useState(EMPTY_LEAD)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [messageKind, setMessageKind] = useState('info')

  usePageSeo({
    title: t('partners.pageTitle'),
    description: t('partners.pageSubtitle'),
  })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      await marketplaceService.submitOfficialVendorLead(form)
      setForm(EMPTY_LEAD)
      setMessageKind('success')
      setMessage(t('partners.leadSuccess'))
    } catch (err) {
      setMessageKind('danger')
      setMessage(err?.response?.data?.error || t('partners.leadError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ta-premium-page">
      <Navbar />
      <div className="container mt-4 ta-premium-shell pb-5">
        <header className="mb-4">
          <p className="small text-uppercase fw-bold mb-2" style={{ color: 'var(--ta-gold-classic)', letterSpacing: '0.08em' }}>
            {t('partners.eyebrow')}
          </p>
          <h1 className="h3 fw-bold mb-2 d-flex align-items-center gap-2 flex-wrap">
            <OfficialPartnerShield width={32} height={34} />
            {t('partners.pageTitle')}
          </h1>
          <p className="text-muted mb-0" style={{ maxWidth: '42rem', lineHeight: 1.55 }}>
            {t('partners.pageSubtitle')}
          </p>
        </header>

        <div className="row g-4">
          <div className="col-lg-7">
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body p-4">
                <h2 className="h6 fw-bold mb-3">{t('partners.benefitsTitle')}</h2>
                <ul className="small mb-0 ps-3" style={{ lineHeight: 1.6 }}>
                  <li>{t('partners.benefit1')}</li>
                  <li>{t('partners.benefit2')}</li>
                  <li>{t('partners.benefit3')}</li>
                  <li>{t('partners.benefit4')}</li>
                </ul>
              </div>
            </div>
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                <h2 className="h6 fw-bold mb-3">{t('partners.applyTitle')}</h2>
                {message && (
                  <div className={`alert alert-${messageKind === 'success' ? 'success' : messageKind === 'danger' ? 'danger' : 'info'} small py-2`}>
                    {message}
                  </div>
                )}
                <form onSubmit={submit} className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label small">{t('partners.fieldBusiness')}</label>
                    <input
                      className="form-control form-control-sm"
                      required
                      value={form.businessName}
                      onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">{t('partners.fieldEmail')}</label>
                    <input
                      type="email"
                      className="form-control form-control-sm"
                      required
                      value={form.contactEmail}
                      onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">{t('partners.fieldContact')}</label>
                    <input
                      className="form-control form-control-sm"
                      value={form.contactName}
                      onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small">{t('partners.fieldWebsite')}</label>
                    <input
                      type="url"
                      className="form-control form-control-sm"
                      required
                      placeholder="https://"
                      value={form.websiteUrl}
                      onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">{t('partners.fieldCountry')}</label>
                    <select
                      className="form-select form-select-sm"
                      value={form.country}
                      onChange={(e) => setForm((f) => ({ ...f, country: e.target.value, state: '', city: '' }))}
                    >
                      {STORE_COUNTRY_OPTIONS.map((opt) => (
                        <option key={opt.iso} value={opt.name}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">{t('partners.fieldState')}</label>
                    <select
                      className="form-select form-select-sm"
                      value={form.state}
                      onChange={(e) => setForm((f) => ({ ...f, state: e.target.value, city: '' }))}
                    >
                      <option value="">—</option>
                      {(STATES_BY_COUNTRY[form.country] || []).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small">{t('partners.fieldCity')}</label>
                    <select
                      className="form-select form-select-sm"
                      value={form.city}
                      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    >
                      <option value="">—</option>
                      {(CITIES_BY_STATE[form.state] || []).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label small">{t('partners.fieldShipping')}</label>
                    <select
                      className="form-select form-select-sm"
                      value={form.shippingScope}
                      onChange={(e) => setForm((f) => ({ ...f, shippingScope: e.target.value }))}
                    >
                      {DELIVERY_SCOPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                      ))}
                    </select>
                    <p className="small text-muted mb-0 mt-1">{t('partners.fieldShippingHint')}</p>
                  </div>
                  <div className="col-12">
                    <label className="form-label small">{t('partners.fieldNote')}</label>
                    <textarea
                      className="form-control form-control-sm"
                      rows={3}
                      value={form.note}
                      onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                    />
                  </div>
                  <div className="col-12">
                    <button type="submit" className="btn btn-dark btn-sm" disabled={busy}>
                      {busy ? t('common.loading') : t('partners.submitCta')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="col-lg-5">
            <div className="card border-warning border-opacity-50 shadow-sm mb-3">
              <div className="card-body p-4">
                <h2 className="h6 fw-bold mb-2">{t('partners.foundingExampleTitle')}</h2>
                <p className="small text-muted mb-3">{t('partners.foundingExampleBlurb')}</p>
                <Link to="/partner/monarch-reptiles" className="btn btn-sm btn-warning fw-semibold">
                  {t('partners.foundingExampleCta')}
                </Link>
              </div>
            </div>
            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                <h2 className="h6 fw-bold mb-2">{t('partners.keeperTitle')}</h2>
                <p className="small text-muted mb-3">{t('partners.keeperBlurb')}</p>
                <Link to="/pro" className="btn btn-sm btn-outline-dark me-2">
                  {t('partners.keeperProCta')}
                </Link>
                <Link to="/marketplace/sell" className="btn btn-sm btn-outline-secondary">
                  {t('partners.keeperSellCta')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
