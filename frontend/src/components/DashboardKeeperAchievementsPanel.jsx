import { useId, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import KeeperBadgeChip from './KeeperBadgeChip'
import { keeperRankName } from '../utils/keeperRank'
import {
  badgeProgressHintLine,
  badgeProgressTitle,
  isBadgeTrackComplete,
  reputationAxisLabel,
} from '../utils/keeperReputationHelpers'

function trackPercent(progress) {
  if (isBadgeTrackComplete(progress)) return 100
  const target = Number(progress?.target || 0)
  const current = Number(progress?.current || 0)
  if (target <= 0) return 100
  return Math.min(100, Math.round((current / target) * 100))
}

function trackShortLabel(t, trackKey) {
  return t(`marketplace.badgeTrack.${trackKey}`, {
    defaultValue: trackKey.replace(/Next$/, ''),
  })
}

function ReputationRing({ score, tierLabel }) {
  const gradId = useId().replace(/:/g, '')
  const pct = Math.min(100, Math.max(0, Number(score || 0)))
  const r = 26
  const c = 2 * Math.PI * r
  const offset = c - (pct / 100) * c
  return (
    <div className="ta-dash-achievements__ring" aria-hidden="true">
      <svg width="60" height="60" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle
          cx="30"
          cy="30"
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 30 30)"
        />
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#b8860b" />
            <stop offset="100%" stopColor="#e8d48a" />
          </linearGradient>
        </defs>
      </svg>
      <span className="ta-dash-achievements__ring-label">
        <strong>{pct}%</strong>
        <small>{tierLabel}</small>
      </span>
    </div>
  )
}

/**
 * Compact dashboard achievements: rank ring, axis chips, track grid, badge strip.
 */
export default function DashboardKeeperAchievementsPanel({
  reputation,
  badgeProgressEntries = [],
  badgeRows = [],
}) {
  const { t } = useTranslation()

  const axes = useMemo(
    () => (Array.isArray(reputation?.axes) ? reputation.axes : []),
    [reputation?.axes],
  )

  const sortedTracks = useMemo(() => {
    return [...badgeProgressEntries].sort((a, b) => {
      const ca = isBadgeTrackComplete(a[1])
      const cb = isBadgeTrackComplete(b[1])
      if (ca !== cb) return ca ? 1 : -1
      return trackPercent(b[1]) - trackPercent(a[1])
    })
  }, [badgeProgressEntries])

  const nextHint = useMemo(() => {
    if (!reputation) return null
    if (reputation.nextTier === 'none' && reputation.tier === 'breeder') {
      return t('marketplace.reputationNextLastRank', {
        remaining:
          reputation.remainingPercent ?? Math.max(0, 100 - Number(reputation.score || 0)),
      })
    }
    if (reputation.nextTier !== 'Max' && reputation.nextTier !== 'none') {
      return t('marketplace.reputationNext', {
        nextRank: keeperRankName(t, reputation.nextTier),
        remaining:
          reputation.remainingPercent ?? Math.max(0, 100 - Number(reputation.score || 0)),
      })
    }
    if (reputation.nextTier === 'Max') return t('marketplace.reputationNextCap')
    return null
  }, [reputation, t])

  const weakest = reputation?.weakestAxisKey || null
  const tierLabel = reputation ? keeperRankName(t, reputation.tier) : ''

  if (!reputation && sortedTracks.length === 0 && badgeRows.length === 0) return null

  return (
    <div className="ta-dash-achievements">
      {reputation && (
        <div className="ta-dash-achievements__hero">
          <ReputationRing score={reputation.score} tierLabel={tierLabel} />
          <div className="ta-dash-achievements__hero-copy min-w-0">
            <div className="ta-dash-achievements__hero-title">
              {t('marketplace.reputationTitle')}
            </div>
            {nextHint && <p className="ta-dash-achievements__hero-hint mb-0">{nextHint}</p>}
            {weakest && (
              <p className="ta-dash-achievements__weakest mb-0">
                {t('marketplace.reputationWeakestHint', {
                  axis: reputationAxisLabel(t, weakest),
                })}
              </p>
            )}
          </div>
          {axes.length > 0 && (
            <div className="ta-dash-achievements__axes" role="list">
              {axes.map((ax) => {
                const seg = Math.min(100, Math.max(0, Number(ax.segmentPercent ?? 0)))
                return (
                  <div className="ta-dash-achievements__axis" key={ax.key} role="listitem">
                    <span className="ta-dash-achievements__axis-name">
                      {reputationAxisLabel(t, ax.key)}
                    </span>
                    <span className="ta-dash-achievements__axis-pct">{seg}%</span>
                    <div className="ta-dash-achievements__axis-bar">
                      <span style={{ width: `${seg}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {sortedTracks.length > 0 && (
        <div className="ta-dash-achievements__section">
          <div className="ta-dash-achievements__section-label">
            {t('dashboard.achievementsTracks')}
          </div>
          <div className="ta-dash-achievements__track-grid">
            {sortedTracks.map(([key, p]) => {
              const complete = isBadgeTrackComplete(p)
              const pct = trackPercent(p)
              const current = Number(p?.current || 0)
              const target = Number(p?.target || 0)
              const hint = badgeProgressHintLine(t, key, p)
              const nextTitle = badgeProgressTitle(t, p)
              return (
                <div
                  key={key}
                  className={`ta-dash-achievements__track${complete ? ' ta-dash-achievements__track--done' : ''}`}
                  title={hint || nextTitle}
                >
                  <div className="ta-dash-achievements__track-head">
                    <span className="ta-dash-achievements__track-name">
                      {trackShortLabel(t, key)}
                    </span>
                    <span className="ta-dash-achievements__track-frac">
                      {complete ? '✓' : `${current}/${target || current}`}
                    </span>
                  </div>
                  <div className="ta-dash-achievements__track-bar">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {badgeRows.length > 0 && (
        <div className="ta-dash-achievements__section">
          <div className="ta-dash-achievements__section-label">
            {t('dashboard.achievementsEarned', { count: badgeRows.length })}
          </div>
          <div className="ta-dash-achievements__badge-strip">
            {badgeRows.map((row) => (
              <KeeperBadgeChip
                key={row.key}
                iconKey={row.iconKey}
                label={row.label}
                tier={row.tier}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
