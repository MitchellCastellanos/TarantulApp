import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BrandName from '../components/BrandName'
import betaApplicationService from '../services/betaApplicationService'

export default function BetaApplyPage() {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    email: '',
    name: '',
    country: '',
    experienceLevel: '',
    devices: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await betaApplicationService.create(form)
      setSubmitted(true)
      setForm({ email: '', name: '', country: '', experienceLevel: '', devices: '', notes: '' })
    } catch (err) {
      const timeout = err?.code === 'ECONNABORTED'
      setError(timeout ? t('admin.betaApplyTimeout') : (err?.response?.data?.error || t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="ta-beta-apply-shell">
      <header className="ta-beta-apply-header text-center pt-4 pb-3 px-3">
        <Link to="/" className="ta-beta-apply-brand text-decoration-none">
          <BrandName />
        </Link>
      </header>

      <main className="container py-3" style={{ maxWidth: 760 }}>
        {submitted ? (
          <div className="card p-4 text-center ta-beta-apply-success">
            <div className="display-6 mb-2">✓</div>
            <h1 className="h4 mb-2">{t('admin.betaApplySubmittedTitle')}</h1>
            <p className="mb-2">{t('admin.betaApplySubmitted')}</p>
            <p className="text-muted small mb-3">{t('admin.betaApplySubmittedSubtitle')}</p>
            <div>
              <Link to="/" className="btn btn-outline-light btn-sm">
                {t('admin.betaApplyBackHome')}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-3">
              <span className="badge bg-warning text-dark">{t('admin.betaApplyLimitedSpots')}</span>
            </div>
            <h1 className="h3 text-center mb-2">{t('admin.betaApplyHeadline')}</h1>
            <p className="text-center text-muted mb-3">{t('admin.betaApplySubLead')}</p>
            <p className="text-center small mb-4">{t('admin.betaApplyEligibility')}</p>

            <form className="card p-3" onSubmit={submit}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">{t('auth.email')}</label>
                  <input className="form-control" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">{t('auth.name')}</label>
                  <input className="form-control" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">{t('admin.country')}</label>
                  <input className="form-control" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">{t('admin.level')}</label>
                  <select className="form-select" value={form.experienceLevel} onChange={(e) => setForm((f) => ({ ...f, experienceLevel: e.target.value }))}>
                    <option value="">{t('admin.selectOne')}</option>
                    <option value="rookie">Rookie</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label">{t('admin.devices')}</label>
                  <input
                    className="form-control"
                    value={form.devices}
                    onChange={(e) => setForm((f) => ({ ...f, devices: e.target.value }))}
                    placeholder={t('admin.devicesPlaceholder')}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">{t('admin.notes')}</label>
                  <textarea className="form-control" rows={4} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              {error ? <div className="alert alert-danger mt-3 mb-0">{error}</div> : null}
              <div className="mt-3">
                <button
                  type="submit"
                  className="btn w-100 fw-semibold"
                  disabled={saving}
                  style={{
                    background: 'linear-gradient(180deg, #2c2419 0%, #17130f 100%)',
                    color: '#f8f1e4',
                    border: '1px solid rgba(232, 197, 71, 0.55)',
                    boxShadow: '0 6px 18px rgba(0, 0, 0, 0.35)',
                  }}
                >
                  {saving ? t('common.saving') : t('admin.applyNow')}
                </button>
              </div>
              <p className="text-muted small mt-3 mb-1 text-center">{t('admin.betaApplyFeedbackPledge')}</p>
              <p className="small text-center mb-1" style={{ color: '#e8c547' }}>{t('admin.betaApplyPerksLine')}</p>
              <p className="text-muted small text-center mb-0">{t('admin.betaApplyAnyLevel')}</p>
            </form>
          </>
        )}
      </main>
    </div>
  )
}
