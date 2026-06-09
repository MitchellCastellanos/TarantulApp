import { useTranslation } from 'react-i18next'
import { VENDOR_LABEL_SIZE_IDS, resolveVendorLabelSizePreset } from '../utils/labelSizes'
import { QR_LAYOUT_MODES } from '../utils/qrLabelOptions'

/**
 * Toggle care facts, layout mode, physical size, and QR target for terrarium labels.
 */
export default function QrLabelOptionsPanel({
  careFactsOn,
  onCareFactsChange,
  qrTargetMode,
  onQrTargetChange,
  speciesLinked,
  hideTargetMode = false,
  className = '',
  verifiedOrigin = null,
  layoutMode = 'simple',
  onLayoutModeChange,
  vendorSizeId = 'medium',
  onVendorSizeChange,
  storefrontLinked = false,
  showVendorPassport = false,
}) {
  const { t } = useTranslation()
  const speciesDisabled = !speciesLinked
  const storefrontDisabled = !storefrontLinked
  const isVendorPassport = layoutMode === 'vendor-passport'

  return (
    <div className={`mb-4 ${className}`.trim()}>
      {verifiedOrigin === true && (
        <div className="alert alert-success py-2 small mb-3">{t('qr.verifiedOrigin.willCarry')}</div>
      )}
      {verifiedOrigin === false && (
        <div className="alert alert-light border py-2 small mb-3">{t('qr.verifiedOrigin.notYet')}</div>
      )}

      {showVendorPassport && onLayoutModeChange ? (
        <fieldset className="mb-3">
          <legend className="form-label small fw-semibold mb-2">{t('qr.layout.heading')}</legend>
          <div className="d-flex flex-column gap-2">
            {QR_LAYOUT_MODES.map((mode) => (
              <label
                key={mode}
                className="d-flex gap-2 align-items-start small"
                style={{ cursor: 'pointer' }}
              >
                <input
                  type="radio"
                  className="form-check-input mt-1 flex-shrink-0"
                  name="qrLayoutMode"
                  checked={layoutMode === mode}
                  onChange={() => onLayoutModeChange(mode)}
                />
                <span>
                  <span className="fw-semibold d-block">{t(`qr.layout.${mode}.label`)}</span>
                  <span className="text-muted">{t(`qr.layout.${mode}.help`)}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {isVendorPassport && onVendorSizeChange ? (
        <div className="mb-3">
          <label className="form-label small fw-semibold mb-1" htmlFor="qrVendorSize">
            {t('qr.vendorSize.heading')}
          </label>
          <select
            id="qrVendorSize"
            className="form-select form-select-sm"
            value={vendorSizeId}
            onChange={(e) => onVendorSizeChange(e.target.value)}
          >
            {VENDOR_LABEL_SIZE_IDS.map((id) => {
              const preset = resolveVendorLabelSizePreset(id)
              return (
                <option key={id} value={id}>
                  {t(`qr.vendorSize.${id}`, {
                    w: preset.widthCm,
                    h: preset.heightCm,
                    defaultValue: `${id} (${preset.widthCm}×${preset.heightCm} cm)`,
                  })}
                </option>
              )
            })}
          </select>
          <p className="small text-muted mb-0 mt-1">{t('qr.vendorSize.help')}</p>
        </div>
      ) : null}

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

      {!hideTargetMode ? (
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
            {showVendorPassport ? (
              <label
                className={`d-flex gap-2 align-items-start small ${storefrontDisabled ? 'opacity-50' : ''}`}
                style={{ cursor: storefrontDisabled ? 'not-allowed' : 'pointer' }}
                title={storefrontDisabled ? t('qr.qrTarget.storefront.disabled') : undefined}
              >
                <input
                  type="radio"
                  className="form-check-input mt-1 flex-shrink-0"
                  name="qrTargetMode"
                  checked={qrTargetMode === 'storefront'}
                  disabled={storefrontDisabled}
                  onChange={() => onQrTargetChange('storefront')}
                />
                <span>
                  <span className="fw-semibold d-block">{t('qr.qrTarget.storefront.label')}</span>
                  <span className="text-muted">
                    {storefrontDisabled
                      ? t('qr.qrTarget.storefront.disabled')
                      : t('qr.qrTarget.storefront.help')}
                  </span>
                </span>
              </label>
            ) : null}
          </div>
        </fieldset>
      ) : null}
    </div>
  )
}
