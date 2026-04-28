import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
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
  const [ok, setOk] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setOk('')
    try {
      await betaApplicationService.create(form)
      setOk(t('admin.betaApplySubmitted'))
      setForm({ email: '', name: '', country: '', experienceLevel: '', devices: '', notes: '' })
    } catch (err) {
      const timeout = err?.code === 'ECONNABORTED'
      setError(timeout ? t('admin.betaApplyTimeout') : (err?.response?.data?.error || t('common.error')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Navbar />
      <div className="container py-4" style={{ maxWidth: 760 }}>
        <h1 className="h4 mb-3">{t('admin.betaApplyTitle')}</h1>
        <p className="text-muted">{t('admin.betaApplyLead')}</p>
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
          {ok ? <div className="alert alert-success mt-3 mb-0">{ok}</div> : null}
          <div className="mt-3">
            <button className="btn btn-warning" disabled={saving} type="submit">{saving ? t('common.saving') : t('admin.apply')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
