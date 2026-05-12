import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import billingService from '../services/billingService'

const SOURCE_ICON = {
  REFERRAL_SIGNUP: '🤝',
  REFERRAL_MILESTONE: '🏅',
  ADMIN: '🎁',
  LEGACY_MIGRATION: '📜',
}

function formatGrantedAt(value, locale) {
  if (!value) return ''
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString(locale || undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch (_) {
    return ''
  }
}

export default function ProDaysSummaryCard() {
  const { t, i18n } = useTranslation()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    billingService
      .proGrantsSummary()
      .then((data) => {
        if (cancelled) return
        setSummary(data)
        setError(false)
      })
      .catch(() => {
        if (cancelled) return
        setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body py-3">
          <div className="d-flex align-items-center gap-2 small text-muted">
            <div className="spinner-border spinner-border-sm" role="status" aria-hidden />
            <span>{t('proGrants.loading')}</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !summary) return null

  const grants = Array.isArray(summary.grants) ? summary.grants : []
  const totalDaysRemaining = summary.totalDaysRemaining ?? 0
  const trialEndsAt = summary.trialEndsAt
  const trialEndsLabel = formatGrantedAt(trialEndsAt, i18n.language)

  return (
    <div className="card border-0 shadow-sm mb-4" style={{ background: 'rgba(45,32,18,0.55)', border: '1px solid var(--ta-border-gold)' }}>
      <div className="card-body">
        <h5 className="fw-bold mb-1" style={{ color: 'var(--ta-gold)' }}>
          {t('proGrants.title')}
        </h5>
        <p className="small text-muted mb-3">{t('proGrants.subtitle')}</p>

        <div className="d-flex flex-wrap align-items-baseline gap-3 mb-3">
          <div>
            <div className="display-6 fw-bold" style={{ color: 'var(--ta-gold)' }}>
              {totalDaysRemaining}
            </div>
            <div className="small text-muted">{t('proGrants.daysRemaining')}</div>
          </div>
          {trialEndsLabel && (
            <div className="small">
              <div className="text-muted">{t('proGrants.proEndsOn')}</div>
              <div className="fw-semibold">{trialEndsLabel}</div>
            </div>
          )}
        </div>

        <h6 className="fw-bold small text-uppercase text-muted mb-2">{t('proGrants.breakdownTitle')}</h6>
        {grants.length === 0 ? (
          <p className="small text-muted mb-3">{t('proGrants.breakdownEmpty')}</p>
        ) : (
          <ul className="list-unstyled small mb-3">
            {grants.map((g) => {
              const icon = SOURCE_ICON[g.source] || '✨'
              const sourceLabel = t(`proGrants.source.${g.source}`, t('proGrants.source.UNKNOWN'))
              const dateLabel = formatGrantedAt(g.grantedAt, i18n.language)
              return (
                <li key={g.id} className="d-flex align-items-start gap-2 mb-2">
                  <span aria-hidden style={{ fontSize: '1.1rem' }}>{icon}</span>
                  <div className="flex-grow-1">
                    <div className="fw-semibold">
                      +{g.days} {t('proGrants.daysSuffix', { count: g.days })} · {sourceLabel}
                    </div>
                    {g.reason && (
                      <div className="text-muted" style={{ fontStyle: 'italic' }}>
                        {g.reason}
                      </div>
                    )}
                    {dateLabel && <div className="text-muted">{dateLabel}</div>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <h6 className="fw-bold small text-uppercase text-muted mb-2">{t('proGrants.howToEarnMoreTitle')}</h6>
        <ul className="small mb-0 ps-3">
          <li>
            {t('proGrants.howToEarnMore.referral')}{' '}
            <Link to="/community?tab=invite">{t('proGrants.howToEarnMore.referralCta')}</Link>
          </li>
          <li>{t('proGrants.howToEarnMore.milestones')}</li>
          <li>{t('proGrants.howToEarnMore.subscribe')}</li>
        </ul>
      </div>
    </div>
  )
}
