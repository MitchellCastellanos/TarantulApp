import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import bugReportService from '../services/bugReportService'

export default function BugReportModal({ open, onClose }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    severity: 'medium',
    title: '',
    description: '',
    expectedBehavior: '',
    screenshotUrl: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  if (!open) return null

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setOk('')
    setSaving(true)
    try {
      await bugReportService.create(form)
      setOk(t('admin.betaBugSubmitted'))
      setForm({ severity: 'medium', title: '', description: '', expectedBehavior: '', screenshotUrl: '' })
    } catch (err) {
      setError(err?.response?.data?.error || t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{t('admin.betaReportBug')}</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={submit}>
            <div className="modal-body">
              <div className="mb-2">
                <label className="form-label">{t('admin.severity')}</label>
                <select className="form-select" value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
                  <option value="low">{t('admin.severityLow')}</option>
                  <option value="medium">{t('admin.severityMedium')}</option>
                  <option value="high">{t('admin.severityHigh')}</option>
                  <option value="critical">{t('admin.severityCritical')}</option>
                </select>
              </div>
              <div className="mb-2">
                <label className="form-label">{t('admin.betaBugTitle')}</label>
                <input className="form-control" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="mb-2">
                <label className="form-label">{t('admin.betaBugWhatHappened')}</label>
                <textarea className="form-control" rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
              </div>
              <div className="mb-2">
                <label className="form-label">{t('admin.betaBugExpected')}</label>
                <textarea className="form-control" rows={3} value={form.expectedBehavior} onChange={(e) => setForm((f) => ({ ...f, expectedBehavior: e.target.value }))} />
              </div>
              <div className="mb-2">
                <label className="form-label">{t('admin.betaBugScreenshot')}</label>
                <input className="form-control" value={form.screenshotUrl} onChange={(e) => setForm((f) => ({ ...f, screenshotUrl: e.target.value }))} placeholder="https://..." />
                <p className="form-text small mb-0">{t('admin.betaBugScreenshotHint')}</p>
              </div>
              {error ? <div className="alert alert-danger py-2">{error}</div> : null}
              {ok ? <div className="alert alert-success py-2">{ok}</div> : null}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>{t('common.cancel')}</button>
              <button type="submit" className="btn btn-warning" disabled={saving}>{saving ? t('common.saving') : t('admin.betaSubmitBug')}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
