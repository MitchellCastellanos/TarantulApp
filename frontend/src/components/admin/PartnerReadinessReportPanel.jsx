import { useTranslation } from 'react-i18next'

const VERDICT_BADGE = {
  ready: 'bg-success',
  needs_feed_config: 'bg-warning text-dark',
  low_fit: 'bg-secondary',
  no_catalog: 'bg-danger',
  shopify_no_autosync: 'bg-info text-dark',
  unknown_platform: 'bg-secondary',
}

function pct(n) {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return `${n}%`
}

export default function PartnerReadinessReportPanel({ report }) {
  const { t } = useTranslation()
  if (!report) return null

  const catalog = report.catalog || {}
  const fit = report.fit || {}
  const fitSuggested = report.fitWithSuggestedConfig
  const verdict = report.verdict || 'unknown'
  const badgeClass = VERDICT_BADGE[verdict] || 'bg-secondary'

  return (
    <div className="card border-success mb-3">
      <div className="card-header py-2 bg-success bg-opacity-10 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <strong className="small">{t('admin.partnerOutreachReportTitle')}</strong>
        <span className={`badge ${badgeClass}`}>{t(`admin.partnerOutreachVerdict.${verdict}`, verdict)}</span>
      </div>
      <div className="card-body small">
        <p className="mb-2">{report.verdictSummary}</p>

        <dl className="row mb-2 g-1">
          <dt className="col-sm-4 mb-0 text-muted">{t('admin.partnerOutreachReportPlatform')}</dt>
          <dd className="col-sm-8 mb-0">{report.detectedPlatform || '—'}</dd>

          <dt className="col-sm-4 mb-0 text-muted">{t('admin.partnerOutreachReportCatalog')}</dt>
          <dd className="col-sm-8 mb-0">
            {catalog.hasCatalog
              ? t('admin.partnerOutreachReportCatalogYes', {
                  sampled: catalog.productsSampled ?? 0,
                  total: catalog.productsTotalEstimate ?? '—',
                })
              : t('admin.partnerOutreachReportCatalogNo')}
          </dd>

          <dt className="col-sm-4 mb-0 text-muted">{t('admin.partnerOutreachReportFit')}</dt>
          <dd className="col-sm-8 mb-0">
            {t('admin.partnerOutreachReportFitLine', {
              importable: fit.importable ?? 0,
              importablePct: pct(fit.importablePercent),
              blocked: (fit.blockedSpecimen ?? 0) + (fit.blockedCategory ?? 0),
              unmapped: fit.unmappedCategory ?? 0,
              total: fit.totalSampled ?? 0,
            })}
          </dd>

          {fitSuggested && (
            <>
              <dt className="col-sm-4 mb-0 text-muted">{t('admin.partnerOutreachReportFitSuggested')}</dt>
              <dd className="col-sm-8 mb-0">
                {t('admin.partnerOutreachReportFitSuggestedLine', {
                  importable: fitSuggested.importable ?? 0,
                  pct: pct(fitSuggested.importablePercent),
                })}
              </dd>
            </>
          )}
        </dl>

        {Array.isArray(report.pitchHints) && report.pitchHints.length > 0 && (
          <div className="mb-2">
            <div className="fw-semibold mb-1">{t('admin.partnerOutreachPitchHints')}</div>
            <ul className="mb-0 ps-3">
              {report.pitchHints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ul>
          </div>
        )}

        {report.suggestedFeedConfig && Object.keys(report.suggestedFeedConfig).length > 0 && (
          <details className="mb-0">
            <summary className="fw-semibold">{t('admin.partnerOutreachSuggestedConfig')}</summary>
            <pre className="small bg-light border rounded p-2 mt-2 mb-0 overflow-auto" style={{ maxHeight: 200 }}>
              {JSON.stringify(report.suggestedFeedConfig, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}
