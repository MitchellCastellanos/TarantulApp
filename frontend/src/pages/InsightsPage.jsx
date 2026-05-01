import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import BrandLogoMark from '../components/BrandLogoMark'
import insightsService from '../services/insightsService'
import { formatDateInUserZone } from '../utils/dateFormat'

function WeekBarChart({ buckets, ariaLabel }) {
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
        return (
          <div key={String(b.weekStart) + String(i)} className="d-flex flex-column align-items-center flex-grow-1" style={{ maxWidth: 48 }}>
            <span className="small fw-semibold" style={{ color: 'var(--ta-gold)', fontSize: '0.65rem' }}>
              {c}
            </span>
            <div
              className="w-100 rounded-top"
              style={{
                height: `${pct}px`,
                minHeight: 4,
                background: 'linear-gradient(180deg, var(--ta-gold), rgba(218,165,32,0.35))',
                border: '1px solid rgba(218,165,32,0.45)',
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
                <div className="card border shadow-sm ta-premium-pane p-3 h-100">
                  <div className="small text-muted text-uppercase">{t('insights.cardActiveSpiders')}</div>
                  <div className="h4 mb-0 mt-1" style={{ color: 'var(--ta-gold)' }}>
                    {data.activeSpiderCount}
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card border shadow-sm ta-premium-pane p-3 h-100">
                  <div className="small text-muted text-uppercase">{t('insights.cardFeeds30d')}</div>
                  <div className="h4 mb-0 mt-1" style={{ color: 'var(--ta-gold)' }}>
                    {data.feedsLast30Days}
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card border shadow-sm ta-premium-pane p-3 h-100">
                  <div className="small text-muted text-uppercase">{t('insights.cardMolts90d')}</div>
                  <div className="h4 mb-0 mt-1" style={{ color: 'var(--ta-gold)' }}>
                    {data.moltsLast90Days}
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card border shadow-sm ta-premium-pane p-3 h-100">
                  <div className="small text-muted text-uppercase">{t('insights.cardTotals')}</div>
                  <div className="small mt-2 mb-0">
                    🍖 {data.totalFeedingLogs} · 🕸️ {data.totalMoltLogs}
                  </div>
                </div>
              </div>
            </div>

            <div className="row g-4 mb-4">
              <div className="col-md-6">
                <div className="card border shadow-sm ta-premium-pane p-3 h-100">
                  <h2 className="h6 fw-bold mb-2">{t('insights.feedsWeekly')}</h2>
                  <WeekBarChart buckets={feedBuckets} ariaLabel={t('insights.feedsWeeklyAria')} />
                </div>
              </div>
              <div className="col-md-6">
                <div className="card border shadow-sm ta-premium-pane p-3 h-100">
                  <h2 className="h6 fw-bold mb-2">{t('insights.moltsWeekly')}</h2>
                  <WeekBarChart buckets={moltBuckets} ariaLabel={t('insights.moltsWeeklyAria')} />
                </div>
              </div>
            </div>

            <div className="card border shadow-sm ta-premium-pane p-3 mb-5">
              <h2 className="h6 fw-bold mb-2">{t('insights.feedingAttention')}</h2>
              <p className="text-muted small">{t('insights.feedingAttentionHint')}</p>
              {!attention.length ? (
                <p className="text-muted small mb-0">{t('insights.feedingAttentionEmpty')}</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm table-borderless align-middle mb-0">
                    <thead>
                      <tr className="small text-muted">
                        <th scope="col">{t('insights.colSpider')}</th>
                        <th scope="col">{t('insights.colLastFeed')}</th>
                        <th scope="col" className="text-end">
                          {t('insights.colDaysSince')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {attention.map((row) => (
                        <tr key={row.tarantulaId}>
                          <td>
                            <Link to={`/tarantulas/${row.tarantulaId}`} className="fw-semibold text-decoration-none">
                              {row.name}
                            </Link>
                          </td>
                          <td className="small">
                            {!row.lastFedAt
                              ? t('insights.neverFed')
                              : formatDateInUserZone(row.lastFedAt, i18n.language)}
                          </td>
                          <td className="text-end small">
                            {row.daysSinceLastFeed == null
                              ? '—'
                              : t('insights.daysCount', { count: row.daysSinceLastFeed })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
