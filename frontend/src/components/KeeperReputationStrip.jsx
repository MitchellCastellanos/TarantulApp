import { useTranslation } from 'react-i18next'
import { keeperRankName } from '../utils/keeperRank'
import { reputationAxisLabel } from '../utils/keeperReputationHelpers'

/**
 * Keeper reputation summary + per-axis milestones for the current stage (from API).
 */
export default function KeeperReputationStrip({ reputation, titleColorVar = 'var(--ta-text)' }) {
  const { t } = useTranslation()
  if (!reputation) return null

  const axes = Array.isArray(reputation.axes) ? reputation.axes : []
  const weakest = reputation.weakestAxisKey || null

  return (
    <div className="ta-keeper-reputation-strip">
      <div className="small fw-semibold mb-1" style={{ color: titleColorVar }}>
        {t('marketplace.reputationTitle')} ·{' '}
        {t('marketplace.reputationLine', {
          rank: keeperRankName(t, reputation.tier),
          score: reputation.score,
        })}
      </div>
      <div className="progress" style={{ height: 8 }}>
        <div
          className="progress-bar bg-warning"
          style={{ width: `${Math.min(100, Number(reputation.score || 0))}%` }}
        />
      </div>
      {reputation.nextTier === 'none' && reputation.tier === 'breeder' && (
        <div className="small text-muted mt-1">
          {t('marketplace.reputationNextLastRank', {
            remaining:
              reputation.remainingPercent ?? Math.max(0, 100 - Number(reputation.score || 0)),
          })}
        </div>
      )}
      {reputation.nextTier !== 'Max' && reputation.nextTier !== 'none' && (
        <div className="small text-muted mt-1">
          {t('marketplace.reputationNext', {
            nextRank: keeperRankName(t, reputation.nextTier),
            remaining:
              reputation.remainingPercent ?? Math.max(0, 100 - Number(reputation.score || 0)),
          })}
        </div>
      )}
      {reputation.nextTier === 'Max' && (
        <div className="small text-muted mt-1">{t('marketplace.reputationNextCap')}</div>
      )}
      {axes.length > 0 && (
        <>
          <div className="small text-muted mt-2 mb-1">{t('marketplace.reputationAxesExplainer')}</div>
          {axes.map((ax) => {
            const seg = Math.min(100, Math.max(0, Number(ax.segmentPercent ?? 0)))
            return (
              <div className="small mb-2" key={ax.key}>
                <div className="d-flex justify-content-between gap-2 align-items-baseline">
                  <span>{reputationAxisLabel(t, ax.key)}</span>
                  <span className="text-muted text-nowrap">{seg}%</span>
                </div>
                <div className="progress mt-1" style={{ height: 4 }}>
                  <div className="progress-bar bg-secondary" style={{ width: `${seg}%` }} />
                </div>
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                  {t('marketplace.reputationAxisRange', {
                    current: ax.current,
                    low: ax.rangeLow,
                    high: ax.rangeHigh,
                  })}
                </div>
              </div>
            )
          })}
        </>
      )}
      {weakest && (
        <div className="small text-muted mt-1">{t('marketplace.reputationWeakestHint', {
          axis: reputationAxisLabel(t, weakest),
        })}</div>
      )}
    </div>
  )
}
