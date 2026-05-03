import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import logsService from '../services/logsService'
import { datetimeLocalToOffsetISO, nowLocalDatetimeInputValue } from '../utils/datetimeSubmit'

const PRE_MOLT_SIGNS = [
  'dark_abdomen',
  'refused_food',
  'built_mat',
  'opaque_eyes',
  'inactive',
  'sealed_burrow',
]

export default function MoltModal({ tarantulaId, onClose, onSaved }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    moltedAt: nowLocalDatetimeInputValue(),
    preSizeCm: '',
    postSizeCm: '',
    notes: '',
    publishToFeed: false,
    successful: null,
    complicationType: '',
    durationMinutes: '',
    preMoltSigns: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const toggleSign = (sign) => {
    setForm((f) => ({
      ...f,
      preMoltSigns: f.preMoltSigns.includes(sign)
        ? f.preMoltSigns.filter((s) => s !== sign)
        : [...f.preMoltSigns, sign],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await logsService.addMolt(tarantulaId, {
        moltedAt: datetimeLocalToOffsetISO(form.moltedAt),
        preSizeCm: form.preSizeCm ? Number(form.preSizeCm) : null,
        postSizeCm: form.postSizeCm ? Number(form.postSizeCm) : null,
        notes: form.notes || null,
        publishToFeed: form.publishToFeed,
        successful: form.successful,
        complicationType: form.complicationType || null,
        durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
        preMoltSigns: form.preMoltSigns.length > 0 ? JSON.stringify(form.preMoltSigns) : null,
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
      <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{t('logModals.moltTitle')}</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && <div className="alert alert-danger small py-2">{error}</div>}
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label small fw-semibold">{t('logModals.dateTime')}</label>
                  <input
                    type="datetime-local"
                    className="form-control form-control-sm"
                    value={form.moltedAt}
                    onChange={(e) => set('moltedAt', e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">{t('logModals.preMoltSize')}</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    className="form-control form-control-sm"
                    value={form.preSizeCm}
                    onChange={(e) => set('preSizeCm', e.target.value)}
                    placeholder={t('logModals.sizeExample', { n: '5.0' })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">{t('logModals.postMoltSize')}</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    className="form-control form-control-sm"
                    value={form.postSizeCm}
                    onChange={(e) => set('postSizeCm', e.target.value)}
                    placeholder={t('logModals.sizeExample', { n: '6.0' })}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">{t('logModals.notes')}</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                    placeholder={t('logModals.optional')}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">{t('molt.preMoltSignsLabel')}</label>
                  <div className="d-flex flex-wrap gap-2">
                    {PRE_MOLT_SIGNS.map((sign) => (
                      <div key={sign} className="form-check form-check-inline m-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`sign-${sign}`}
                          checked={form.preMoltSigns.includes(sign)}
                          onChange={() => toggleSign(sign)}
                        />
                        <label className="form-check-label small" htmlFor={`sign-${sign}`}>
                          {t(`molt.sign_${sign}`)}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">{t('molt.successfulLabel')}</label>
                  <div className="d-flex gap-3 flex-wrap">
                    {[
                      { val: true, key: 'successYes' },
                      { val: false, key: 'successNo' },
                    ].map(({ val, key }) => (
                      <div key={key} className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="molt-successful"
                          id={`molt-success-${key}`}
                          checked={form.successful === val}
                          onChange={() => set('successful', val)}
                        />
                        <label className="form-check-label small" htmlFor={`molt-success-${key}`}>
                          {t(`molt.${key}`)}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                {form.successful === false && (
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">{t('molt.complicationTypeLabel')}</label>
                    <select
                      className="form-select form-select-sm"
                      value={form.complicationType}
                      onChange={(e) => set('complicationType', e.target.value)}
                    >
                      <option value="">{t('logModals.select')}</option>
                      {['dysecdysis', 'limb_loss', 'partial_shed', 'prolonged', 'other'].map((c) => (
                        <option key={c} value={c}>
                          {t(`molt.complication_${c}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">{t('molt.durationLabel')}</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control form-control-sm"
                    value={form.durationMinutes}
                    onChange={(e) => set('durationMinutes', e.target.value)}
                    placeholder={t('molt.durationPlaceholder')}
                  />
                </div>
                <div className="col-12">
                  <div className="form-check">
                    <input
                      id="molt-publish-feed"
                      className="form-check-input"
                      type="checkbox"
                      checked={!!form.publishToFeed}
                      onChange={(e) => set('publishToFeed', e.target.checked)}
                    />
                    <label className="form-check-label small" htmlFor="molt-publish-feed">
                      {t('logModals.publishToFeed')}
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-light btn-sm" onClick={onClose}>
                {t('logModals.cancel')}
              </button>
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
