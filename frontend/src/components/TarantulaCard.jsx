import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import StatusBadge from './StatusBadge'
import FangPanel from './FangPanel'
import { imgUrl } from '../services/api'
import { publicUrl } from '../utils/publicAssets.js'
import { useAppTheme } from '../hooks/useAppTheme'

const HABITAT_ICON = { terrestrial: '🌎', arboreal: '🌳', fossorial: '🕳️' }

export default function TarantulaCard({ tarantula }) {
  const { t } = useTranslation()
  const theme = useAppTheme()
  const { id, name, species, stage, sex, currentSizeCm, profilePhoto, status, locked } = tarantula
  const placeholder = publicUrl('spider-default.png')
  const brandLogoSrc = publicUrl(theme === 'light' ? 'logo-black.png' : 'logo-neon.png')
  // Own upload first, then species reference (DB / iNat URL), then placeholder; broken URLs fall back on error.
  const primarySrc = profilePhoto
    ? imgUrl(profilePhoto)
    : imgUrl(species?.referencePhotoUrl) || placeholder

  return (
    <Link to={`/tarantulas/${id}`} className="text-decoration-none">
      <FangPanel className="h-100 ta-tarantula-fang-card" cornerOffset={10}>
      <div className="card h-100 shadow-sm border-0 tarantula-card ta-premium-tarantula-card">
        <div className="card-img-top d-flex align-items-center justify-content-center overflow-hidden position-relative ta-premium-photo-stage">
          <img
            src={primarySrc}
            alt={name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              e.currentTarget.onerror = null
              e.currentTarget.src = placeholder
            }}
          />
          <div className="ta-premium-photo-overlay" />
          {!profilePhoto && species?.referencePhotoUrl?.trim() && (
            <span
              className="position-absolute top-0 start-0 ta-premium-ref-chip ta-premium-ref-chip--in-fang-card"
              title={t('species.refPhoto')}
            >
              <span aria-hidden="true">📷</span>
            </span>
          )}
          <div className="ta-premium-card-meta">
            <div className="d-flex justify-content-between align-items-start gap-2">
              <div className="min-w-0 flex-grow-1">
                {species && (
                  <p className="mb-0 ta-premium-species ta-premium-card-text-wrap">
                    {species.scientificName}
                  </p>
                )}
                <h6 className="card-title mb-0 ta-premium-common-name ta-premium-card-text-wrap">
                  {name}
                </h6>
              </div>
              <div className="d-flex align-items-center gap-1 flex-shrink-0">
                {locked && (
                  <span className="badge bg-secondary" style={{ fontSize: '0.6rem' }} title={t('tarantula.lockedEditHint')}>
                    {t('tarantula.lockedShort')}
                  </span>
                )}
                <StatusBadge status={status} />
              </div>
            </div>
            <div className="d-flex justify-content-between align-items-end gap-2 mt-1 ta-premium-card-meta-lower">
              <div className="min-w-0 flex-grow-1">
                <div className="ta-premium-tech-line ta-premium-tech-line--first">
                  {stage && <span>{t(`stages.${stage}`, { defaultValue: stage })}</span>}
                  {currentSizeCm && <span>📏 {currentSizeCm} cm</span>}
                </div>
                <div className="ta-premium-tech-line">
                  {sex && <span>{t(`sex.${sex}`, { defaultValue: sex })}</span>}
                  {species?.habitatType && <span>{HABITAT_ICON[species.habitatType]}</span>}
                </div>
              </div>
              <img
                src={`${brandLogoSrc}?v=2`}
                alt=""
                className="ta-tarantula-card-brand-mark flex-shrink-0"
                width={44}
                height={44}
                loading="lazy"
                decoding="async"
                aria-hidden
              />
            </div>
          </div>
        </div>
      </div>
      </FangPanel>
    </Link>
  )
}
