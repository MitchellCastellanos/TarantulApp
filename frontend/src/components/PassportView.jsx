import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BrandLogoMark from './BrandLogoMark'
import BrandName from './BrandName'
import FangPanel from './FangPanel'
import SpeciesProfileCard from './SpeciesProfileCard'
import { publicUrl } from '../utils/publicAssets.js'

const HABITAT_ICON = { terrestrial: '🌎', arboreal: '🌳', fossorial: '🕳️' }

/**
 * Public view for an unclaimed digital passport at /t/{shortId}.
 * Value-first: species info and creator attribution before any claim flow (Phase 2).
 */
export default function PassportView({ profile, speciesView, shortId }) {
  const { t } = useTranslation()
  const scientificName = profile?.scientificName || ''
  const commonName = profile?.commonName || ''
  const habitat = profile?.habitatType
  const proGiftDays = profile?.proGiftDays || 30
  const creatorLabel = profile?.creatorHandle
    ? `@${profile.creatorHandle}`
    : (profile?.creatorDisplayName || null)

  return (
    <div className="min-vh-100" style={{ backgroundImage: `url('${publicUrl('bg-texture.png')}')`, backgroundColor: 'var(--ta-bg)' }}>
      <div className="container py-4" style={{ maxWidth: 480 }}>
        <div className="text-center mb-4">
          <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
            <BrandLogoMark size={40} showIntro={false} />
            <BrandName className="cinzel fw-bold" style={{ color: 'var(--ta-gold)' }} />
          </div>
          <p className="small text-uppercase fw-bold mb-1" style={{ color: 'var(--ta-gold)', letterSpacing: '0.08em' }}>
            {t('passport.badge')}
          </p>
          <h1 className="h4 mb-1" style={{ color: 'var(--ta-parchment)' }}>
            {scientificName || t('passport.unknownSpecies')}
          </h1>
          {commonName && (
            <p className="small mb-0" style={{ color: 'var(--ta-parchment)', opacity: 0.75 }}>
              {commonName}
            </p>
          )}
        </div>

        <FangPanel className="mb-3">
          <p className="mb-3" style={{ color: 'var(--ta-parchment)' }}>
            {t('passport.intro')}
          </p>

          <div className="d-flex flex-wrap gap-2 mb-3">
            {profile?.stage && (
              <span className="badge bg-secondary">{t(`stages.${profile.stage}`, profile.stage)}</span>
            )}
            {profile?.sex && (
              <span className="badge bg-secondary">{t(`sex.${profile.sex}`, profile.sex)}</span>
            )}
            {habitat && HABITAT_ICON[habitat] && (
              <span className="badge bg-dark">{HABITAT_ICON[habitat]} {t(`habitat.${habitat}`, habitat)}</span>
            )}
          </div>

          {profile?.labelNotes && (
            <p className="small mb-3 fst-italic" style={{ color: 'var(--ta-parchment)', opacity: 0.85 }}>
              {profile.labelNotes}
            </p>
          )}

          {creatorLabel && (
            <p className="small mb-0" style={{ color: 'var(--ta-parchment)', opacity: 0.8 }}>
              {t('passport.fromCreator')}{' '}
              {profile?.creatorHandle ? (
                <Link to={`/u/${profile.creatorHandle}`} className="text-decoration-none" style={{ color: 'var(--ta-gold)' }}>
                  {creatorLabel}
                </Link>
              ) : (
                <span style={{ color: 'var(--ta-gold)' }}>{creatorLabel}</span>
              )}
            </p>
          )}
        </FangPanel>

        <FangPanel className="mb-3">
          <p className="small fw-bold text-uppercase mb-2" style={{ color: 'var(--ta-gold)' }}>
            {t('passport.giftTitle')}
          </p>
          <p className="mb-0" style={{ color: 'var(--ta-parchment)' }}>
            {t('passport.giftBody', { days: proGiftDays })}
          </p>
        </FangPanel>

        {speciesView?.species && (
          <FangPanel className="mb-3">
            <div className="card border-0 shadow-sm ta-premium-pane">
              <div className="card-body">
                <SpeciesProfileCard
                  species={speciesView.species}
                  t={t}
                  fallbackPhoto={speciesView.fallbackPhoto}
                />
              </div>
            </div>
          </FangPanel>
        )}

        <FangPanel>
          <p className="small mb-0 text-center" style={{ color: 'var(--ta-parchment)', opacity: 0.75 }}>
            {t('passport.claimComingSoon')}
          </p>
        </FangPanel>

        <p className="text-center small mt-3 mb-0" style={{ color: 'var(--ta-parchment)', opacity: 0.5 }}>
          {shortId}
        </p>
      </div>
    </div>
  )
}
