import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import adminService from '../../services/adminService'

const RANGES = ['7d', '30d', '90d', 'all']

/** Seconds → compact "Xh Ym" / "Xm Ys" / "Xs". */
function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(Number(totalSeconds) || 0))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ${m % 60}m`
  const d = Math.floor(h / 24)
  return `${d}d ${h % 24}h`
}

function countryFlag(code) {
  if (!code || typeof code !== 'string' || code.length !== 2) return ''
  const base = 0x1f1e6
  const cc = code.toUpperCase()
  try {
    return String.fromCodePoint(base + (cc.charCodeAt(0) - 65), base + (cc.charCodeAt(1) - 65))
  } catch {
    return ''
  }
}

export default function AdminAnalyticsPage() {
  const { t } = useTranslation()
  const [range, setRange] = useState('30d')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    adminService
      .appAnalytics(range)
      .then((res) => {
        if (!cancelled) setData(res && typeof res === 'object' ? res : null)
      })
      .catch((err) => {
        if (cancelled) return
        const code = err?.response?.status
        setError(code === 403 ? t('admin.onlyAdmins') : t('admin.loadError'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [range, t])

  const byCountry = Array.isArray(data?.byCountry) ? data.byCountry : []
  const byCity = Array.isArray(data?.byCity) ? data.byCity : []
  const byPlatform = Array.isArray(data?.byPlatform) ? data.byPlatform : []
  const byDay = Array.isArray(data?.byDay) ? data.byDay : []
  const maxDayVisits = byDay.reduce((m, r) => Math.max(m, Number(r?.visits) || 0), 0)

  const rangeLabel = (r) => t(`admin.analyticsRange_${r}`, r === 'all' ? 'All time' : `Last ${r}`)

  return (
    <>
      <h2 className="h5 mb-2">{t('admin.analyticsTitle', 'App analytics')}</h2>
      <p className="small text-muted mb-3">
        {t(
          'admin.analyticsBlurb',
          'Visits, time spent in the app, and where users come from. Location is derived from the device timezone (or edge geo headers) — no IP addresses are stored.',
        )}
      </p>

      <div className="d-flex flex-wrap gap-2 align-items-end mb-3">
        <div>
          <label className="form-label small mb-0" htmlFor="analytics-range">
            {t('admin.analyticsRangeLabel', 'Period')}
          </label>
          <select
            id="analytics-range"
            className="form-select form-select-sm"
            style={{ minWidth: 160 }}
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            {RANGES.map((r) => (
              <option key={r} value={r}>
                {rangeLabel(r)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading ? (
        <p className="text-muted small">{t('common.loading')}</p>
      ) : !data ? (
        <p className="text-muted small">{t('admin.analyticsEmpty', 'No analytics data yet.')}</p>
      ) : (
        <>
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-3">
              <div className="card p-3">
                <small className="text-muted">{t('admin.analyticsVisits', 'Visits')}</small>
                <div className="h5 mb-0">{data.visits ?? 0}</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card p-3">
                <small className="text-muted">{t('admin.analyticsPageViews', 'Page views')}</small>
                <div className="h5 mb-0">{data.pageViews ?? 0}</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card p-3">
                <small className="text-muted">{t('admin.analyticsAvgSession', 'Avg. time / visit')}</small>
                <div className="h5 mb-0">{formatDuration(data.avgSessionSeconds)}</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card p-3">
                <small className="text-muted">{t('admin.analyticsTotalTime', 'Total time in app')}</small>
                <div className="h5 mb-0">{formatDuration(data.totalEngagedSeconds)}</div>
              </div>
            </div>
          </div>

          <p className="small text-muted mb-3">
            {t('admin.analyticsRegisteredVisitors', 'Signed-in visitors')}:{' '}
            <strong>{data.registeredVisitors ?? 0}</strong>
          </p>

          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <div className="card p-3 h-100">
                <h3 className="h6 mb-3">{t('admin.analyticsByCountry', 'By country')}</h3>
                {byCountry.length === 0 ? (
                  <p className="text-muted small mb-0">{t('admin.analyticsEmpty', 'No analytics data yet.')}</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          <th>{t('admin.analyticsCountryCol', 'Country')}</th>
                          <th className="text-end">{t('admin.analyticsVisits', 'Visits')}</th>
                          <th className="text-end">{t('admin.analyticsTimeCol', 'Time')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {byCountry.map((row, i) => (
                          <tr key={`${row.country}-${i}`}>
                            <td>
                              {countryFlag(row.countryCode)} {row.country || t('admin.analyticsUnknown', 'Unknown')}
                            </td>
                            <td className="text-end font-monospace">{row.visits ?? 0}</td>
                            <td className="text-end font-monospace">{formatDuration(row.engagedSeconds)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div className="card p-3 h-100">
                <h3 className="h6 mb-3">{t('admin.analyticsByCity', 'By city')}</h3>
                {byCity.length === 0 ? (
                  <p className="text-muted small mb-0">{t('admin.analyticsEmpty', 'No analytics data yet.')}</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          <th>{t('admin.analyticsCityCol', 'City')}</th>
                          <th>{t('admin.analyticsCountryCol', 'Country')}</th>
                          <th className="text-end">{t('admin.analyticsVisits', 'Visits')}</th>
                          <th className="text-end">{t('admin.analyticsTimeCol', 'Time')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {byCity.map((row, i) => (
                          <tr key={`${row.city}-${row.country}-${i}`}>
                            <td>{row.city || t('admin.analyticsUnknown', 'Unknown')}</td>
                            <td className="text-muted small">{row.country || '-'}</td>
                            <td className="text-end font-monospace">{row.visits ?? 0}</td>
                            <td className="text-end font-monospace">{formatDuration(row.engagedSeconds)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div className="card p-3 h-100">
                <h3 className="h6 mb-3">{t('admin.analyticsByPlatform', 'By platform')}</h3>
                {byPlatform.length === 0 ? (
                  <p className="text-muted small mb-0">{t('admin.analyticsEmpty', 'No analytics data yet.')}</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          <th>{t('admin.analyticsPlatformCol', 'Platform')}</th>
                          <th className="text-end">{t('admin.analyticsVisits', 'Visits')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {byPlatform.map((row, i) => (
                          <tr key={`${row.platform}-${i}`}>
                            <td className="text-capitalize">{row.platform || t('admin.analyticsUnknown', 'Unknown')}</td>
                            <td className="text-end font-monospace">{row.visits ?? 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div className="card p-3 h-100">
                <h3 className="h6 mb-3">{t('admin.analyticsTrend', 'Daily visits')}</h3>
                {byDay.length === 0 ? (
                  <p className="text-muted small mb-0">{t('admin.analyticsEmpty', 'No analytics data yet.')}</p>
                ) : (
                  <div className="d-flex flex-column gap-1">
                    {byDay.map((row) => {
                      const visits = Number(row.visits) || 0
                      const pct = maxDayVisits > 0 ? Math.round((visits / maxDayVisits) * 100) : 0
                      return (
                        <div key={row.day} className="d-flex align-items-center gap-2 small">
                          <span className="text-muted" style={{ minWidth: 84 }}>
                            {row.day}
                          </span>
                          <div className="flex-grow-1 bg-body-secondary rounded" style={{ height: 14 }}>
                            <div
                              className="bg-primary rounded"
                              style={{ width: `${pct}%`, height: '100%' }}
                              aria-hidden="true"
                            />
                          </div>
                          <span className="font-monospace" style={{ minWidth: 36, textAlign: 'right' }}>
                            {visits}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
