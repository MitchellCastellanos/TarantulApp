import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import logsService from '../services/logsService'
import { datetimeLocalToOffsetISO, nowLocalDatetimeInputValue } from '../utils/datetimeSubmit'
import { useUnitSystem } from '../hooks/useUnitSystem'
import { cmToInput, inputToCm } from '../utils/units'

const PRE_MOLT_SIGNS = [
  'dark_abdomen',
  'refused_food',
  'built_mat',
  'opaque_eyes',
  'inactive',
  'sealed_burrow',
]

export default function MoltModal({ tarantulaId, tarantula, onClose, onSaved }) {
  const { t } = useTranslation()
  const { system, unit, step } = useUnitSystem()
  const [form, setForm] = useState({
    moltedAt: nowLocalDatetimeInputValue(),
    preSize: cmToInput(tarantula?.currentSizeCm, system),
    postSize: '',
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
        preSizeCm: inputToCm(form.preSize, system),
        postSizeCm: inputToCm(form.postSize, system),
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
              <p className="small text-muted mb-3" style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                {t('molt.modalIntro')}
              </p>
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
                  <p className="form-text small mb-0 mt-1" style={{ fontSize: '0.72rem' }}>
                    {t('logModals.dateTimeHint')}
                  </p>
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">{t('logModals.preMoltSize', { unit })}</label>
                  <input
                    type="number"
                    step={step}
                    min="0"
                    className="form-control form-control-sm"
                    value={form.preSize}
                    onChange={(e) => set('preSize', e.target.value)}
                    placeholder={t('logModals.sizeExample', { n: system === 'imperial' ? '2.0' : '5.0' })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">{t('logModals.postMoltSize', { unit })}</label>
                  <input
                    type="number"
                    step={step}
                    min="0"
                    className="form-control form-control-sm"
                    value={form.postSize}
                    onChange={(e) => set('postSize', e.target.value)}
                    placeholder={t('logModals.sizeExample', { n: system === 'imperial' ? '2.4' : '6.0' })}
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
