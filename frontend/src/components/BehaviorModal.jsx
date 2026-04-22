import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import logsService from '../services/logsService'
import { datetimeLocalToOffsetISO, nowLocalDatetimeInputValue } from '../utils/datetimeSubmit'

const MOODS = ['calm', 'active', 'hiding', 'defensive', 'pre_molt']

export default function BehaviorModal({ tarantulaId, onClose, onSaved }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    loggedAt: nowLocalDatetimeInputValue(),
    mood: '', notes: '', publishToFeed: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await logsService.addBehavior(tarantulaId, {
        loggedAt: datetimeLocalToOffsetISO(form.loggedAt),
        mood: form.mood || null,
        notes: form.notes,
      })
      setLoading(false)
      onSaved()
    } catch (err) {
      console.error('[BehaviorModal] guardar comportamiento', err?.response?.status, err?.response?.data ?? err)
      setError(t('logModals.saveError'))
      setLoading(false)
    }
  }

  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{t('logModals.behaviorTitle')}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && <div className="alert alert-danger small py-2">{error}</div>}
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label small fw-semibold">{t('logModals.dateTime')}</label>
                  <input type="datetime-local" className="form-control form-control-sm"
                         value={form.loggedAt} onChange={e => set('loggedAt', e.target.value)} required />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">{t('logModals.moodLabel')}</label>
                  <div className="d-flex flex-wrap gap-2 mt-1">
                    {MOODS.map(m => (
                      <button key={m} type="button"
                              className={`btn btn-sm ${form.mood === m ? 'btn-dark' : 'btn-outline-secondary'}`}
                              onClick={() => set('mood', form.mood === m ? '' : m)}>
                        {t(`moods.${m}`)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">{t('logModals.notes')}</label>
                  <textarea className="form-control form-control-sm" rows={2}
                            value={form.notes} onChange={e => set('notes', e.target.value)}
                            placeholder={t('logModals.behaviorNotesPlaceholder')} />
                </div>
                <div className="col-12">
                  <div className="form-check">
                    <input
                      id="behavior-publish-feed"
                      className="form-check-input"
                      type="checkbox"
                      checked={!!form.publishToFeed}
                      onChange={(e) => set('publishToFeed', e.target.checked)}
                    />
                    <label className="form-check-label small" htmlFor="behavior-publish-feed">
                      {t('logModals.publishToFeed')}
                    </label>
                  </div>
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
