import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import BrandLogoMark from '../components/BrandLogoMark'
import insightsService from '../services/insightsService'
import { formatDateInUserZone } from '../utils/dateFormat'

/** Rotating bar gradients: feeding = “life / appetite” cool greens & teals; molts = purple / coral / sky. */
const BAR_PALETTES = {
  feeds: [
    { hi: '#4ade80', mid: '#22c55e', lo: 'rgba(22, 101, 52, 0.55)', border: 'rgba(74, 222, 128, 0.45)', label: '#bbf7d0' },
    { hi: '#2dd4bf', mid: '#14b8a6', lo: 'rgba(15, 118, 110, 0.6)', border: 'rgba(45, 212, 191, 0.5)', label: '#99f6e4' },
    { hi: '#38bdf8', mid: '#0ea5e9', lo: 'rgba(3, 105, 161, 0.55)', border: 'rgba(56, 189, 248, 0.45)', label: '#bae6fd' },
    { hi: '#a78bfa', mid: '#8b5cf6', lo: 'rgba(91, 33, 182, 0.55)', border: 'rgba(167, 139, 250, 0.45)', label: '#ddd6fe' },
    { hi: '#fbbf24', mid: '#f59e0b', lo: 'rgba(180, 83, 9, 0.5)', border: 'rgba(251, 191, 36, 0.5)', label: '#fef3c7' },
    { hi: '#f472b6', mid: '#ec4899', lo: 'rgba(157, 23, 77, 0.55)', border: 'rgba(244, 114, 182, 0.45)', label: '#fce7f3' },
  ],
  molts: [
    { hi: '#c4b5fd', mid: '#a78bfa', lo: 'rgba(76, 29, 149, 0.55)', border: 'rgba(196, 181, 253, 0.5)', label: '#ede9fe' },
    { hi: '#fb923c', mid: '#f97316', lo: 'rgba(154, 52, 18, 0.55)', border: 'rgba(251, 146, 60, 0.45)', label: '#ffedd5' },
    { hi: '#67e8f9', mid: '#22d3ee', lo: 'rgba(14, 116, 144, 0.55)', border: 'rgba(103, 232, 249, 0.45)', label: '#cffafe' },
    { hi: '#f9a8d4', mid: '#f472b6', lo: 'rgba(157, 23, 77, 0.5)', border: 'rgba(249, 168, 212, 0.45)', label: '#fce7f3' },
    { hi: '#86efac', mid: '#4ade80', lo: 'rgba(22, 101, 52, 0.5)', border: 'rgba(134, 239, 172, 0.4)', label: '#dcfce7' },
    { hi: '#fcd34d', mid: '#fbbf24', lo: 'rgba(146, 64, 14, 0.5)', border: 'rgba(252, 211, 77, 0.45)', label: '#fef9c3' },
  ],
}

function WeekBarChart({ buckets, ariaLabel, variant = 'feeds' }) {
  const palette = BAR_PALETTES[variant] || BAR_PALETTES.feeds
  const max = useMemo(() => buckets.reduce((m, b) => Math.max(m, Number(b.count) || 0), 1), [buckets])
  if (!buckets.length) {
    return <p className="text-muted small mb-0">{ariaLabel}</p>
  }
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="d-flex align-items-end gap-1 ta-insights-bars"
      style={{ minHeight: 120 }}
    >
      {buckets.map((b, i) => {
        const c = Number(b.count) || 0
        const pct = Math.max(6, Math.round((100 * c) / max))
        const col = palette[i % palette.length]
        return (
          <div key={String(b.weekStart) + String(i)} className="d-flex flex-column align-items-center flex-grow-1" style={{ maxWidth: 48 }}>
            <span className="small fw-semibold ta-insights-bar-label" style={{ color: col.label, fontSize: '0.65rem' }}>
              {c}
            </span>
            <div
              className="w-100 rounded-top ta-insights-bar-pillar"
              style={{
                height: `${pct}px`,
                minHeight: 4,
                background: `linear-gradient(180deg, ${col.hi} 0%, ${col.mid} 44%, ${col.lo} 100%)`,
                border: `1px solid ${col.border}`,
                boxShadow: `0 0 12px ${col.border}`,
              }}
              title={`${c}`}
            />
          </div>
        )
      })}
    </div>
  )
}

export default function InsightsPage() {
  const { t, i18n } = useTranslation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  useEffect(() => {
    insightsService
      .getCollection()
      .then(setData)
      .catch((e) => setErr(String(e.response?.status || e.message || '')))
      .finally(() => setLoading(false))
  }, [])

  const feedBuckets = data?.feedingsByWeek || []
  const moltBuckets = data?.moltsByWeek || []
  const attention = data?.feedingAttention || []

  return (
    <div className="ta-premium-dashboard min-vh-100 d-flex flex-column">
      <Navbar />
      <div className="container py-4 flex-grow-1" style={{ maxWidth: 900 }}>
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <BrandLogoMark width={42} aria-hidden />
            <h1 className="ta-premium-section-title mb-0">{t('insights.title')}</h1>
          </div>
          <Link to="/" className="btn btn-outline-secondary btn-sm">
            ← {t('discover.myCollection', 'My collection')}
          </Link>
        </div>

        <p className="text-collection small mb-4">{t('insights.lead')}</p>

        {loading && <p className="text-muted">{t('common.loading')}</p>}
        {err && !loading && (
          <div className="alert alert-danger small">{t('insights.loadError', { detail: err })}</div>
        )}

        {!loading && data && (
          <>
            <div className="row g-3 mb-4">
              <div className="col-6 col-md-3">
                <div className="card border shadow-sm ta-premium-pane p-3 h-100 ta-insights-stat-card ta-insights-stat-card--spiders">
                  <div className="small text-muted text-uppercase">{t('insights.cardActiveSpiders')}</div>
                  <div className="h4 mb-0 mt-1 ta-insights-stat-value" style={{ color: '#c4b5fd' }}>
                    {data.activeSpiderCount}
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card border shadow-sm ta-premium-pane p-3 h-100 ta-insights-stat-card ta-insights-stat-card--feeds">
                  <div className="small text-muted text-uppercase">{t('insights.cardFeeds30d')}</div>
                  <div className="h4 mb-0 mt-1 ta-insights-stat-value" style={{ color: '#4ade80' }}>
                    {data.feedsLast30Days}
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card border shadow-sm ta-premium-pane p-3 h-100 ta-insights-stat-card ta-insights-stat-card--molts">
                  <div className="small text-muted text-uppercase">{t('insights.cardMolts90d')}</div>
                  <div className="h4 mb-0 mt-1 ta-insights-stat-value" style={{ color: '#fb923c' }}>
                    {data.moltsLast90Days}
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card border shadow-sm ta-premium-pane p-3 h-100 ta-insights-stat-card ta-insights-stat-card--totals">
                  <div className="small text-muted text-uppercase">{t('insights.cardTotals')}</div>
                  <div className="small mt-2 mb-0" style={{ color: 'var(--ta-text)', lineHeight: 1.5 }}>
                    <span style={{ color: '#38bdf8' }}>🍖 {data.totalFeedingLogs}</span>
                    <span className="text-muted mx-1">·</span>
                    <span style={{ color: '#a78bfa' }}>🕸️ {data.totalMoltLogs}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="row g-4 mb-4">
              <div className="col-md-6">
                <div className="card border shadow-sm ta-premium-pane p-3 h-100 ta-insights-chart-card ta-insights-chart-card--feeds">
                  <h2 className="h6 fw-bold mb-2 d-flex align-items-center gap-2">
                    <span className="ta-insights-chart-dot" style={{ background: 'linear-gradient(135deg,#4ade80,#22d3ee)' }} aria-hidden />
                    {t('insights.feedsWeekly')}
                  </h2>
                  <WeekBarChart buckets={feedBuckets} ariaLabel={t('insights.feedsWeeklyAria')} variant="feeds" />
                </div>
              </div>
              <div className="col-md-6">
                <div className="card border shadow-sm ta-premium-pane p-3 h-100 ta-insights-chart-card ta-insights-chart-card--molts">
                  <h2 className="h6 fw-bold mb-2 d-flex align-items-center gap-2">
                    <span className="ta-insights-chart-dot" style={{ background: 'linear-gradient(135deg,#c4b5fd,#fb923c)' }} aria-hidden />
                    {t('insights.moltsWeekly')}
                  </h2>
                  <WeekBarChart buckets={moltBuckets} ariaLabel={t('insights.moltsWeeklyAria')} variant="molts" />
                </div>
              </div>
            </div>

            <section className="card border shadow-sm ta-premium-pane p-0 mb-5 overflow-hidden ta-insights-attention-card">
              <div className="ta-insights-attention-card__head px-3 py-3">
                <h2 className="h6 fw-bold mb-1 cinzel">{t('insights.feedingAttention')}</h2>
                <p className="small mb-0" style={{ color: 'var(--ta-text-muted)' }}>{t('insights.feedingAttentionHint')}</p>
              </div>
              {!attention.length ? (
                <div className="px-3 pb-3">
                  <p className="text-muted small mb-0">{t('insights.feedingAttentionEmpty')}</p>
                </div>
              ) : (
                <div className="table-responsive ta-insights-attention-table-wrap">
                  <table className="table table-sm align-middle mb-0 ta-insights-attention-table">
                    <thead>
                      <tr>
                        <th scope="col">{t('insights.colSpider')}</th>
                        <th scope="col">{t('insights.colLastFeed')}</th>
                        <th scope="col" className="text-end">
                          {t('insights.colDaysSince')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {attention.map((row) => {
                        const urgent = !row.lastFedAt
                        return (
                          <tr key={row.tarantulaId} className={urgent ? 'ta-insights-attention-row--urgent' : undefined}>
                            <td>
                              <Link
                                to={`/tarantulas/${row.tarantulaId}`}
                                className="fw-semibold text-decoration-none ta-insights-spider-link"
                              >
                                {row.name}
                              </Link>
                            </td>
                            <td className="small ta-insights-attention-muted">
                              {!row.lastFedAt ? (
                                <span className="ta-insights-badge-never">{t('insights.neverFed')}</span>
                              ) : (
                                formatDateInUserZone(row.lastFedAt, i18n.language)
                              )}
                            </td>
                            <td className={`text-end small fw-semibold ${urgent ? 'ta-insights-days-urgent' : 'ta-insights-days-normal'}`}>
                              {row.daysSinceLastFeed == null
                                ? '—'
                                : t('insights.daysCount', { count: row.daysSinceLastFeed })}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}
