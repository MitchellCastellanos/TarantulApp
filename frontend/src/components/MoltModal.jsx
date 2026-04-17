import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import logsService from '../services/logsService'
import { datetimeLocalToOffsetISO, nowLocalDatetimeInputValue } from '../utils/datetimeSubmit'

export default function MoltModal({ tarantulaId, onClose, onSaved }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    moltedAt: nowLocalDatetimeInputValue(),
    preSizeCm: '', postSizeCm: '', notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await logsService.addMolt(tarantulaId, {
        moltedAt: datetimeLocalToOffsetISO(form.moltedAt),
        preSizeCm: form.preSizeCm ? Number(form.preSizeCm) : null,
        postSizeCm: form.postSizeCm ? Number(form.postSizeCm) : null,
        notes: form.notes,
      })
      setLoading(false)
      onSaved()
    } catch (err) {
      console.error('[MoltModal] guardar muda', err?.response?.status, err?.response?.data ?? err)
      setError(t('logModals.saveError'))
      setLoading(false)
    }
  }

  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{t('logModals.moltTitle')}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && <div className="alert alert-danger small py-2">{error}</div>}
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label small fw-semibold">{t('logModals.dateTime')}</label>
                  <input type="datetime-local" className="form-control form-control-sm"
                         value={form.moltedAt} onChange={e => set('moltedAt', e.target.value)} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">{t('logModals.preMoltSize')}</label>
                  <input type="number" step="0.1" min="0" className="form-control form-control-sm"
                         value={form.preSizeCm} onChange={e => set('preSizeCm', e.target.value)}
                         placeholder={t('logModals.sizeExample', { n: '5.0' })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">{t('logModals.postMoltSize')}</label>
                  <input type="number" step="0.1" min="0" className="form-control form-control-sm"
                         value={form.postSizeCm} onChange={e => set('postSizeCm', e.target.value)}
                         placeholder={t('logModals.sizeExample', { n: '6.0' })} />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">{t('logModals.notes')}</label>
                  <input type="text" className="form-control form-control-sm"
                         value={form.notes} onChange={e => set('notes', e.target.value)}
                         placeholder={t('logModals.optional')} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-light btn-sm" onClick={onClose}>{t('logModals.cancel')}</button>
              <button type="submit" className="btn btn-dark btn-sm" disabled={loading}>
                {loading ? t('logModals.saving') : t('logModals.save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
