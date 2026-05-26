import { useTranslation } from 'react-i18next'

const STORE_TYPE_LABEL = {
  woocommerce: 'WooCommerce',
  shopify: 'Shopify',
  lightspeed: 'Lightspeed eCom',
  wordpress: 'WordPress',
  bigcommerce: 'BigCommerce',
  unknown: '—',
}

export default function PartnerReadinessReportPanel({ report }) {
  const { t } = useTranslation()
  if (!report) return null

  const products = report.products || {}
  const storeCategories = Array.isArray(report.storeCategories) ? report.storeCategories : []
  const sampleNames = Array.isArray(report.sampleProductNames) ? report.sampleProductNames : []
  const checklistNotes = report.checklistNotes || {}
  const syncSupport = report.syncSupport || {}
  const storeType = report.storeType || 'unknown'
  const fromSitemap = products.dataSource === 'sitemap'

  const countLabel =
    products.countTotalEstimate != null && products.countTotalEstimate > 0
      ? fromSitemap
        ? t('admin.partnerPreviewProductCountSitemap', { total: products.countTotalEstimate })
        : products.countInSample != null
          ? t('admin.partnerPreviewProductCountWithTotal', {
              sample: products.countInSample,
              total: products.countTotalEstimate,
            })
          : t('admin.partnerPreviewProductCount', { count: products.countTotalEstimate })
      : t('admin.partnerPreviewNoProducts')

  return (
    <div className="card border-success mb-3">
      <div className="card-header py-2 bg-success bg-opacity-10">
        <strong className="small">{t('admin.partnerPreviewReportTitle')}</strong>
      </div>
      <div className="card-body small">
        {syncSupport.headline && (
          <div
            className={`alert py-2 mb-2 ${
              syncSupport.autosyncToday ? 'alert-success' : 'alert-warning'
            }`}
            role="status"
          >
            <div className="fw-semibold">{syncSupport.headline}</div>
            {syncSupport.detail && <div className="mb-0 mt-1">{syncSupport.detail}</div>}
          </div>
        )}

        {report.summaryLine && <p className="mb-2 text-muted">{report.summaryLine}</p>}

        <dl className="row mb-2 g-1">
          <dt className="col-sm-4 mb-0 text-muted">{t('admin.partnerPreviewStoreType')}</dt>
          <dd className="col-sm-8 mb-0">
            {report.storeTypeLabel || STORE_TYPE_LABEL[storeType] || storeType}
            {report.recommendedFeedType && (
              <span className="text-muted ms-1">
                · {t('admin.partnerPreviewRecommendedFeed', { feed: report.recommendedFeedType })}
              </span>
            )}
          </dd>

          <dt className="col-sm-4 mb-0 text-muted">{t('admin.partnerPreviewProducts')}</dt>
          <dd className="col-sm-8 mb-0">
            {products.found ? countLabel : t('admin.partnerPreviewNoProducts')}
            {products.fetchDetail && (
              <div className="text-muted mt-1">{products.fetchDetail}</div>
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
                  {cat.productCount != null
                    ? t('admin.partnerPreviewCategoryProductCount', { count: cat.productCount })
                    : t('admin.partnerPreviewCategoryUrlCount', { count: cat.urlCount ?? 0 })}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(sampleNames.length > 0 ||
          (Array.isArray(products.credentialSampleTitles) && products.credentialSampleTitles.length > 0)) && (
          <div className="mb-2">
            <div className="fw-semibold mb-1">{t('admin.partnerPreviewSampleProducts')}</div>
            <ul className="mb-0 ps-3">
              {(sampleNames.length > 0 ? sampleNames : products.credentialSampleTitles).map((name) => (
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
