import { useTranslation } from 'react-i18next'

const STORE_TYPE_LABEL = {
  woocommerce: 'WooCommerce',
  shopify: 'Shopify',
  wordpress: 'WordPress',
  unknown: '—',
}

export default function PartnerReadinessReportPanel({ report }) {
  const { t } = useTranslation()
  if (!report) return null

  const products = report.products || {}
  const storeCategories = Array.isArray(report.storeCategories) ? report.storeCategories : []
  const appCounts = report.appCategoryCounts || {}
  const sampleNames = Array.isArray(report.sampleProductNames) ? report.sampleProductNames : []
  const checklistNotes = report.checklistNotes || {}
  const storeType = report.storeType || 'unknown'

  const countLabel =
    products.countTotalEstimate != null && products.countTotalEstimate > (products.countInSample ?? 0)
      ? t('admin.partnerPreviewProductCountWithTotal', {
          sample: products.countInSample ?? 0,
          total: products.countTotalEstimate,
        })
      : t('admin.partnerPreviewProductCount', { count: products.countInSample ?? 0 })

  return (
    <div className="card border-success mb-3">
      <div className="card-header py-2 bg-success bg-opacity-10">
        <strong className="small">{t('admin.partnerPreviewReportTitle')}</strong>
      </div>
      <div className="card-body small">
        {report.summaryLine && <p className="mb-2 fw-semibold">{report.summaryLine}</p>}

        <dl className="row mb-2 g-1">
          <dt className="col-sm-4 mb-0 text-muted">{t('admin.partnerPreviewStoreType')}</dt>
          <dd className="col-sm-8 mb-0">
            {report.storeTypeLabel || STORE_TYPE_LABEL[storeType] || storeType}
            {report.autosyncSupportedToday && (
              <span className="badge bg-success ms-1">{t('admin.partnerPreviewAutosyncYes')}</span>
            )}
            {storeType === 'shopify' && (
              <span className="badge bg-secondary ms-1">{t('admin.partnerPreviewAutosyncNo')}</span>
            )}
          </dd>

          <dt className="col-sm-4 mb-0 text-muted">{t('admin.partnerPreviewProducts')}</dt>
          <dd className="col-sm-8 mb-0">
            {products.found ? countLabel : t('admin.partnerPreviewNoProducts')}
            {products.fetchDetail && products.fetchDetail !== 'OK' && (
              <span className="text-muted"> ({products.fetchDetail})</span>
            )}
          </dd>
        </dl>

        {storeCategories.length > 0 && (
          <div className="mb-2">
            <div className="fw-semibold mb-1">{t('admin.partnerPreviewStoreCategories')}</div>
            <ul className="mb-0 ps-3">
              {storeCategories.map((cat) => (
                <li key={cat.slug}>
                  <code>{cat.slug}</code>
                  {cat.name && cat.name !== cat.slug ? ` (${cat.name})` : ''}
                  {' — '}
                  {t('admin.partnerPreviewCategoryProductCount', { count: cat.productCount ?? 0 })}
                </li>
              ))}
            </ul>
          </div>
        )}

        {Object.keys(appCounts).length > 0 && (
          <div className="mb-2">
            <div className="fw-semibold mb-1">{t('admin.partnerPreviewAppCategories')}</div>
            <p className="text-muted mb-1">{t('admin.partnerPreviewAppCategoriesHint')}</p>
            <ul className="mb-0 ps-3">
              {Object.entries(appCounts).map(([cat, count]) => (
                <li key={cat}>
                  {cat}: {count}
                </li>
              ))}
            </ul>
          </div>
        )}

        {sampleNames.length > 0 && (
          <div className="mb-2">
            <div className="fw-semibold mb-1">{t('admin.partnerPreviewSampleProducts')}</div>
            <ul className="mb-0 ps-3">
              {sampleNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        )}

        {Object.keys(checklistNotes).length > 0 && (
          <details className="mb-0">
            <summary className="fw-semibold">{t('admin.partnerPreviewChecklistNotes')}</summary>
            <ul className="mb-0 ps-3 mt-2">
              {Object.entries(checklistNotes).map(([key, note]) => (
                <li key={key}>
                  <span className="text-muted">{key}:</span> {note}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  )
}
