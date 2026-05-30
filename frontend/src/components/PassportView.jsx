import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BrandLogoMark from './BrandLogoMark'
import BrandName from './BrandName'
import FangPanel from './FangPanel'
import SpeciesProfileCard from './SpeciesProfileCard'
import VerifiedOriginBadge from './VerifiedOriginBadge'
import { useAuth } from '../context/AuthContext'
import billingService from '../services/billingService'
import passportService from '../services/passportService'
import reminderService from '../services/reminderService'
import { publicUrl } from '../utils/publicAssets.js'

const HABITAT_ICON = { terrestrial: '🌎', arboreal: '🌳', fossorial: '🕳️' }

/**
 * Public view for an unclaimed digital passport at /t/{shortId}.
 * Value-first content, then claim CTA → auth → collection + Pro gift.
 */
export default function PassportView({ profile, speciesView, shortId, onClaimed }) {
  const { t } = useTranslation()
  const { token, user, updateUserProfile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [phase, setPhase] = useState('view')
  const [name, setName] = useState('')
  const [setupReminder, setSetupReminder] = useState(true)
  const [setupMoltReminder, setSetupMoltReminder] = useState(true)
  const [moltReminderCreated, setMoltReminderCreated] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [claimResult, setClaimResult] = useState(null)

  const scientificName = profile?.scientificName || ''
  const commonName = profile?.commonName || ''
  const habitat = profile?.habitatType
  const proGiftDays = profile?.proGiftDays || 30
  const creatorLabel = profile?.creatorHandle
    ? `@${profile.creatorHandle}`
    : (profile?.creatorDisplayName || null)

  const defaultName = useMemo(() => {
    if (commonName) return commonName
    if (scientificName) return scientificName
    return ''
  }, [commonName, scientificName])

  useEffect(() => {
    if (!name && defaultName) setName(defaultName)
  }, [defaultName, name])

  useEffect(() => {
    if (token && searchParams.get('claim') === '1') {
      setPhase('claimForm')
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('claim')
        return next
      }, { replace: true })
    }
  }, [token, searchParams, setSearchParams])

  const loginHref = `/login`
  const loginState = { redirectAfterAuth: `/t/${shortId}?claim=1` }

  const runClaim = async () => {
    setBusy(true)
    setError('')
    try {
      const result = await passportService.claim(shortId, {
        name: name.trim() || undefined,
        setupFeedingReminder: setupReminder,
      })
      setClaimResult(result)
      setPhase('wizard')
      try {
        const billing = await billingService.me()
        if (billing?.plan) {
          updateUserProfile({
            plan: billing.plan,
            inTrial: billing.inTrial,
            readOnly: billing.readOnly,
            trialEndsAt: billing.trialEndsAt ?? null,
            overFreeLimit: billing.overFreeLimit,
            strictReadOnly: billing.strictReadOnly,
          })
        }
      } catch {
        /* best-effort refresh after Pro gift */
      }
      onClaimed?.(result)
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || ''
      if (e?.response?.status === 409) {
        setError(t('passport.claimAlreadyClaimed'))
      } else if (msg.includes('6 tarántulas') || msg.includes('6 tarantulas')) {
        setError(t('passport.claimFreeLimit'))
      } else {
        setError(t('passport.claimError'))
      }
    } finally {
      setBusy(false)
    }
  }

  const finishWizard = async () => {
    if (setupMoltReminder && claimResult?.tarantulaId) {
      setBusy(true)
      try {
        const due = new Date()
        due.setDate(due.getDate() + 60)
        await reminderService.create({
          tarantulaId: claimResult.tarantulaId,
          type: 'molt',
          dueDate: due.toISOString(),
          message: `Molt check for ${claimResult.name || 'your tarantula'}`,
        })
        setMoltReminderCreated(true)
      } catch {
        /* optional reminder — do not block success */
      } finally {
        setBusy(false)
      }
    }
    setPhase('success')
  }

  if (phase === 'wizard' && claimResult) {
    return (
      <div className="min-vh-100" style={{ backgroundImage: `url('${publicUrl('bg-texture.png')}')`, backgroundColor: 'var(--ta-bg)' }}>
        <div className="container py-5" style={{ maxWidth: 480 }}>
          <div className="text-center mb-4">
            <div className="fs-1 mb-2">🕷️</div>
            <h1 className="h4 mb-2" style={{ color: 'var(--ta-parchment)' }}>
              {t('passport.wizardTitle')}
            </h1>
            <p className="mb-0 small" style={{ color: 'var(--ta-parchment)', opacity: 0.85 }}>
              {t('passport.wizardBlurb')}
            </p>
          </div>

          <FangPanel className="mb-3">
            {claimResult.feedingReminderCreated && (
              <p className="small mb-2" style={{ color: 'var(--ta-parchment)' }}>
                ✓ {t('passport.reminderScheduled')}
              </p>
            )}
            <div className="form-check mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                id="passport-molt-reminder"
                checked={setupMoltReminder}
                onChange={(e) => setSetupMoltReminder(e.target.checked)}
              />
              <label htmlFor="passport-molt-reminder" className="form-check-label small" style={{ color: 'var(--ta-parchment)' }}>
                {t('passport.wizardMoltReminder')}
              </label>
            </div>
          </FangPanel>

          <button
            type="button"
            className="btn btn-lg w-100"
            style={{ background: 'var(--ta-gold)', color: '#111', fontWeight: 600 }}
            disabled={busy}
            onClick={() => finishWizard()}
          >
            {busy ? t('common.loading') : t('passport.wizardContinue')}
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'success' && claimResult) {
    return (
      <div className="min-vh-100" style={{ backgroundImage: `url('${publicUrl('bg-texture.png')}')`, backgroundColor: 'var(--ta-bg)' }}>
        <div className="container py-5" style={{ maxWidth: 480 }}>
          <div className="text-center mb-4">
            <div className="fs-1 mb-2">🎉</div>
            <h1 className="h4 mb-2" style={{ color: 'var(--ta-parchment)' }}>
              {t('passport.claimSuccessTitle', { name: claimResult.name })}
            </h1>
            <p className="mb-0" style={{ color: 'var(--ta-parchment)', opacity: 0.85 }}>
              {t('passport.claimSuccessBody')}
            </p>
          </div>

          <FangPanel className="mb-3">
            <p className="small fw-bold text-uppercase mb-2" style={{ color: 'var(--ta-gold)' }}>
              {t('passport.giftTitle')}
            </p>
            <p className="mb-0" style={{ color: 'var(--ta-parchment)' }}>
              {t('passport.giftActivated', { days: claimResult.proGiftDays || proGiftDays })}
            </p>
          </FangPanel>

          {claimResult.feedingReminderCreated && (
            <FangPanel className="mb-3">
              <p className="small mb-0" style={{ color: 'var(--ta-parchment)' }}>
                {t('passport.reminderScheduled')}
              </p>
            </FangPanel>
          )}

          {moltReminderCreated && (
            <FangPanel className="mb-3">
              <p className="small mb-0" style={{ color: 'var(--ta-parchment)' }}>
                {t('passport.moltReminderScheduled')}
              </p>
            </FangPanel>
          )}

          <div className="d-grid gap-2">
            <button
              type="button"
              className="btn btn-lg"
              style={{ background: 'var(--ta-gold)', color: '#111', fontWeight: 600 }}
              onClick={() => window.location.reload()}
            >
              {t('passport.viewSpecimenCard')}
            </button>
            {user?.publicHandle ? (
              <Link
                to={`/tarantulas/${claimResult.tarantulaId}`}
                className="btn btn-outline-light"
              >
                {t('passport.openInCollection')}
              </Link>
            ) : (
              <Link
                to="/onboarding/handle"
                state={{ redirectAfterAuth: `/tarantulas/${claimResult.tarantulaId}` }}
                className="btn btn-outline-light"
              >
                {t('passport.setupKeeperProfile')}
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

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
            <p className="small mb-2" style={{ color: 'var(--ta-parchment)', opacity: 0.8 }}>
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
          {profile?.origin?.verified && (
            <div className="d-flex align-items-center gap-2 mt-1 flex-wrap">
              {profile.origin.logoUrl && (
                <img
                  src={profile.origin.logoUrl}
                  alt={profile.origin.displayName || 'origin logo'}
                  style={{ maxHeight: 40, maxWidth: 120, objectFit: 'contain' }}
                />
              )}
              <VerifiedOriginBadge origin={profile.origin} showTooltip />
            </div>
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
          {phase === 'view' && (
            <div className="d-grid gap-2">
              <p className="small text-center mb-2" style={{ color: 'var(--ta-parchment)', opacity: 0.85 }}>
                {t('passport.claimPrompt')}
              </p>
              {token ? (
                <button
                  type="button"
                  className="btn btn-lg"
                  style={{ background: 'var(--ta-gold)', color: '#111', fontWeight: 600 }}
                  onClick={() => setPhase('claimForm')}
                >
                  {t('passport.claimCta')}
                </button>
              ) : (
                <Link
                  to={loginHref}
                  state={loginState}
                  className="btn btn-lg text-center"
                  style={{ background: 'var(--ta-gold)', color: '#111', fontWeight: 600 }}
                >
                  {t('passport.claimCtaSignIn')}
                </Link>
              )}
            </div>
          )}

          {phase === 'claimForm' && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                runClaim()
              }}
            >
              <p className="small fw-bold mb-3" style={{ color: 'var(--ta-gold)' }}>
                {t('passport.claimFormTitle')}
              </p>
              <label className="form-label small" style={{ color: 'var(--ta-parchment)' }}>
                {t('passport.specimenNameLabel')}
              </label>
              <input
                type="text"
                className="form-control mb-3"
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={defaultName || t('passport.specimenNamePlaceholder')}
              />
              <div className="form-check mb-3">
                <input
                  id="passport-setup-reminder"
                  type="checkbox"
                  className="form-check-input"
                  checked={setupReminder}
                  onChange={(e) => setSetupReminder(e.target.checked)}
                />
                <label htmlFor="passport-setup-reminder" className="form-check-label small" style={{ color: 'var(--ta-parchment)' }}>
                  {t('passport.setupReminderLabel')}
                </label>
              </div>
              {error && (
                <p className="small text-danger mb-3">{error}</p>
              )}
              <div className="d-grid gap-2">
                <button
                  type="submit"
                  className="btn btn-lg"
                  disabled={busy}
                  style={{ background: 'var(--ta-gold)', color: '#111', fontWeight: 600 }}
                >
                  {busy ? t('common.loading') : t('passport.claimConfirm')}
                </button>
                <button
                  type="button"
                  className="btn btn-link btn-sm text-muted"
                  disabled={busy}
                  onClick={() => setPhase('view')}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          )}
        </FangPanel>

        <p className="text-center small mt-3 mb-0" style={{ color: 'var(--ta-parchment)', opacity: 0.5 }}>
          {shortId}
        </p>
      </div>
    </div>
  )
}
