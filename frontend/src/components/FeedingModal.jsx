import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import logsService from '../services/logsService'
import { datetimeLocalToOffsetISO, nowLocalDatetimeInputValue } from '../utils/datetimeSubmit'

const PREY_KEYS = ['preyCricket', 'preyDubia', 'preySuperworm', 'preyWorm', 'preyPinkies', 'preyOther']
const SIZE_KEYS = ['sizeExtraSmall', 'sizeSmall', 'sizeMedium', 'sizeLarge']

export default function FeedingModal({ tarantulaId, onClose, onSaved }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    fedAt: nowLocalDatetimeInputValue(),
    preyType: '', preySize: '', quantity: 1, accepted: true, notes: '', publishToFeed: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await logsService.addFeeding(tarantulaId, {
        ...form,
        fedAt: datetimeLocalToOffsetISO(form.fedAt),
        quantity: Number(form.quantity),
      })
      setLoading(false)
      onSaved()
    } catch (err) {
      console.error('[FeedingModal] guardar alimentación', err?.response?.status, err?.response?.data ?? err)
      setError(t('logModals.saveError'))
      setLoading(false)
    }
  }

  return (
    <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered" onClick={e => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{t('logModals.feedingTitle')}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && <div className="alert alert-danger small py-2">{error}</div>}

              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label small fw-semibold">{t('logModals.dateTime')}</label>
                  <input type="datetime-local" className="form-control form-control-sm"
                         value={form.fedAt} onChange={e => set('fedAt', e.target.value)} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">{t('logModals.preyType')}</label>
                  <select className="form-select form-select-sm"
                          value={form.preyType} onChange={e => set('preyType', e.target.value)}>
                    <option value="">{t('logModals.select')}</option>
                    {PREY_KEYS.map(k => (
                      <option key={k} value={t(`logModals.${k}`)}>{t(`logModals.${k}`)}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">{t('logModals.preySize')}</label>
                  <select className="form-select form-select-sm"
                          value={form.preySize} onChange={e => set('preySize', e.target.value)}>
                    <option value="">{t('logModals.select')}</option>
                    {SIZE_KEYS.map(k => (
                      <option key={k} value={t(`logModals.${k}`)}>{t(`logModals.${k}`)}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">{t('logModals.quantity')}</label>
                  <input type="number" min="1" className="form-control form-control-sm"
                         value={form.quantity} onChange={e => set('quantity', e.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">{t('logModals.accepted')}</label>
                  <select className="form-select form-select-sm"
                          value={form.accepted} onChange={e => set('accepted', e.target.value === 'true')}>
                    <option value="true">{t('logModals.acceptedYes')}</option>
                    <option value="false">{t('logModals.acceptedNo')}</option>
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">{t('logModals.notes')}</label>
                  <input type="text" className="form-control form-control-sm"
                         value={form.notes} onChange={e => set('notes', e.target.value)}
                         placeholder={t('logModals.optional')} />
                </div>
                <div className="col-12">
                  <div className="form-check">
                    <input
                      id="feeding-publish-feed"
                      className="form-check-input"
                      type="checkbox"
                      checked={!!form.publishToFeed}
                      onChange={(e) => set('publishToFeed', e.target.checked)}
                    />
                    <label className="form-check-label small" htmlFor="feeding-publish-feed">
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
