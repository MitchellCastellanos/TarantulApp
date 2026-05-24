import { useTranslation } from 'react-i18next'

/**
 * Toggle care facts + QR target (specimen vs species) for terrarium labels.
 */
export default function QrLabelOptionsPanel({
  careFactsOn,
  onCareFactsChange,
  qrTargetMode,
  onQrTargetChange,
  speciesLinked,
  className = '',
}) {
  const { t } = useTranslation()
  const speciesDisabled = !speciesLinked

  return (
    <div className={`mb-4 ${className}`.trim()}>
      <div className="form-check form-switch mb-3">
        <input
          className="form-check-input"
          type="checkbox"
          id="qrCareFactsToggle"
          checked={careFactsOn}
          onChange={(e) => onCareFactsChange(e.target.checked)}
        />
        <label className="form-check-label small fw-semibold" htmlFor="qrCareFactsToggle">
          {t('qr.facts.toggle')}
        </label>
      </div>

      <fieldset className="mb-0">
        <legend className="form-label small fw-semibold mb-2">{t('qr.qrTarget.heading')}</legend>
        <div className="d-flex flex-column gap-2">
          <label className="d-flex gap-2 align-items-start small" style={{ cursor: 'pointer' }}>
            <input
              type="radio"
              className="form-check-input mt-1 flex-shrink-0"
              name="qrTargetMode"
              checked={qrTargetMode === 'specimen'}
              onChange={() => onQrTargetChange('specimen')}
            />
            <span>
              <span className="fw-semibold d-block">{t('qr.qrTarget.specimen.label')}</span>
              <span className="text-muted">{t('qr.qrTarget.specimen.help')}</span>
            </span>
          </label>
          <label
            className={`d-flex gap-2 align-items-start small ${speciesDisabled ? 'opacity-50' : ''}`}
            style={{ cursor: speciesDisabled ? 'not-allowed' : 'pointer' }}
            title={speciesDisabled ? t('qr.qrTarget.species.disabled') : undefined}
          >
            <input
              type="radio"
              className="form-check-input mt-1 flex-shrink-0"
              name="qrTargetMode"
              checked={qrTargetMode === 'species'}
              disabled={speciesDisabled}
              onChange={() => onQrTargetChange('species')}
            />
            <span>
              <span className="fw-semibold d-block">{t('qr.qrTarget.species.label')}</span>
              <span className="text-muted">
                {speciesDisabled ? t('qr.qrTarget.species.disabled') : t('qr.qrTarget.species.help')}
              </span>
            </span>
          </label>
        </div>
      </fieldset>
    </div>
  )
}
