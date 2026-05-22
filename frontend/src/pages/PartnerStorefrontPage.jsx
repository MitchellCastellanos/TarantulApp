import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import OfficialPartnerShield from '../components/OfficialPartnerShield'
import PartnerCartBar from '../components/PartnerCartBar'
import marketplaceService from '../services/marketplaceService'
import { decodeListingTitle, partnerListingImageUrl } from '../utils/listingDisplay'
import { addPartnerCartLine } from '../utils/partnerCart'
import { usePageSeo } from '../hooks/usePageSeo'

const CATEGORIES = [
  'tarantulas',
  'breeding_projects',
  'live_food',
  'substrates',
  'terrariums',
  'supplies',
]
const DEFAULT_CATEGORY = 'tarantulas'

export default function PartnerStorefrontPage() {
  const { slug } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [vendor, setVendor] = useState(null)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [message, setMessage] = useState('')

  const listingCategory = CATEGORIES.includes(searchParams.get('category') || '')
    ? searchParams.get('category')
    : DEFAULT_CATEGORY
  const query = searchParams.get('q') || ''
  const promotedOnly = searchParams.get('promoted') === '1'

  const isFounding = vendor?.isFoundingPartner === true
  const location = useMemo(
    () => [vendor?.city, vendor?.state, vendor?.country].filter(Boolean).join(' · '),
    [vendor?.city, vendor?.country, vendor?.state],
  )

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const canonical = origin && slug ? `${origin}/partner/${encodeURIComponent(slug)}` : undefined
  usePageSeo({
    title: vendor?.name ? `${vendor.name} · ${t('marketplace.partnerStorefrontTitle')}` : t('marketplace.partnerStorefrontTitle'),
    description: vendor?.note || t('marketplace.partnerStorefrontSubtitle'),
    imageUrl: origin ? `${origin}/icon-512.png` : undefined,
    canonicalHref: canonical,
  })

  const loadCatalog = useCallback(async () => {
    if (!slug?.trim()) return
    setLoading(true)
    setError('')
    try {
      const data = await marketplaceService.getPartnerCatalog({
        vendorSlug: slug.trim(),
        listingCategory,
        q: query.trim() || undefined,
        promotedOnly: promotedOnly ? true : undefined,
      })
      setVendor(data?.vendor || null)
      const list = Array.isArray(data?.items) ? data.items : []
      setItems(list)
      setTotal(data?.total ?? list.length)
    } catch (err) {
      setVendor(null)
      setItems([])
      setTotal(0)
      setError(err?.response?.status === 404 ? 'notfound' : 'load')
    } finally {
      setLoading(false)
    }
  }, [slug, listingCategory, query, promotedOnly])

  useEffect(() => {
    loadCatalog()
  }, [loadCatalog])

  const setCategory = (cat) => {
    if (!CATEGORIES.includes(cat)) return
    const next = new URLSearchParams(searchParams)
    next.set('category', cat)
    setSearchParams(next, { replace: true })
  }

  const setQuery = (q) => {
    const next = new URLSearchParams(searchParams)
    if (q.trim()) next.set('q', q.trim())
    else next.delete('q')
    setSearchParams(next, { replace: true })
  }

  const togglePromoted = () => {
    const next = new URLSearchParams(searchParams)
    if (promotedOnly) next.delete('promoted')
    else next.set('promoted', '1')
    setSearchParams(next, { replace: true })
  }

  const addLine = (l, ev) => {
    ev?.stopPropagation?.()
    addPartnerCartLine({
      vendorSlug: slug,
      listingId: l.id,
      externalProductId: l.partnerExternalId,
      title: l.title,
      priceAmount: l.priceAmount,
      currency: l.currency,
      imageUrl: l.imageUrl,
      canonicalUrl: l.canonicalUrl,
      quantity: 1,
    })
    setMessage(t('marketplace.partnerCartAdded'))
  }

  const partnerBadge = (l) => {
    if (l?.isFoundingPartner || l?.partnerProgramTier === 'STRATEGIC_FOUNDER') {
      return t('marketplace.foundingPartnerBadge')
    }
    return l?.badgeLabel || t('marketplace.certifiedPartnerBadge')
  }

  return (
    <div
      className={`ta-premium-page ta-partner-storefront${isFounding ? ' ta-partner-storefront--founding' : ''}${vendor?.websiteUrl ? ' ta-partner-storefront--has-website-bar' : ''}`}
    >
      <Navbar />
      <div className="container mt-4 ta-premium-shell pb-5 mb-5">
        <Link to="/marketplace" className="btn btn-sm btn-outline-secondary mb-3">
          {t('marketplace.listingDetailBack')}
        </Link>

        {loading && <p className="text-muted small">{t('common.loading')}</p>}
        {!loading && error === 'notfound' && (
          <p className="text-muted small">{t('marketplace.partnerStorefrontNotFound')}</p>
        )}
        {!loading && error === 'load' && (
          <p className="text-muted small">{t('marketplace.partnerStorefrontLoadError')}</p>
        )}

        {!loading && !error && vendor && (
          <>
            <header className={`ta-partner-storefront-hero card border-0 shadow-sm mb-4${isFounding ? ' ta-partner-storefront-hero--founding' : ''}`}>
              <div className="card-body p-3 p-md-4">
                <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
                  <div className="min-w-0">
                    <p className="small text-uppercase fw-bold mb-2 ta-partner-storefront-hero__eyebrow">
                      {t('marketplace.partnerStorefrontEyebrow')}
                    </p>
                    <h1 className="h3 fw-bold mb-2 d-flex align-items-center gap-2 flex-wrap">
                      {isFounding && <OfficialPartnerShield width={28} height={30} />}
                      <span>{vendor.name}</span>
                      {isFounding && (
                        <span className="badge bg-warning text-dark">{t('marketplace.foundingPartnerBadge')}</span>
                      )}
                      {!isFounding && vendor.badge && (
                        <span className="badge bg-warning text-dark">{vendor.badge}</span>
                      )}
                    </h1>
                    {location && <div className="small text-muted mb-2">{location}</div>}
                    {vendor.note ? (
                      <p className="small mb-2 mb-md-0" style={{ lineHeight: 1.55, maxWidth: '42rem' }}>
                        {vendor.note}
                      </p>
                    ) : null}
                    <div className="small text-muted mt-2">
                      {vendor.nationalShipping ? t('marketplace.nationalShipping') : t('marketplace.regionalShipping')}
                      {(vendor.shipsToCountries || []).length > 0 && (
                        <span className="d-block mt-1">
                          {t('marketplace.shipsTo')}: {(vendor.shipsToCountries || []).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-end flex-shrink-0">
                    <div className="fw-semibold" style={{ color: 'var(--ta-gold-classic)' }}>
                      {t('marketplace.partnerStorefrontCount', { count: total })}
                    </div>
                    <div className="small text-muted">{t('marketplace.partnerStorefrontPoweredBy')}</div>
                  </div>
                </div>
              </div>
            </header>

            {message && (
              <div className="alert alert-success small py-2 mb-3" role="status">
                {message}
              </div>
            )}

            <div className="card border-0 shadow-sm ta-premium-pane mb-3">
              <div className="card-body p-3">
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`btn btn-sm ${listingCategory === cat ? 'btn-warning fw-semibold' : 'btn-outline-secondary'}`}
                      onClick={() => setCategory(cat)}
                    >
                      {t(`marketplace.category.${cat}`)}
                    </button>
                  ))}
                </div>
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <input
                    className="form-control form-control-sm flex-grow-1"
                    style={{ minWidth: 160 }}
                    placeholder={t('marketplace.searchPlaceholder')}
                    defaultValue={query}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setQuery(e.target.value)
                    }}
                    onBlur={(e) => setQuery(e.target.value)}
                  />
                  <button
                    type="button"
                    className={`btn btn-sm ${promotedOnly ? 'btn-warning fw-semibold' : 'btn-outline-warning'}`}
                    onClick={togglePromoted}
                  >
                    {t('marketplace.tarantulaCribsFilter')}
                  </button>
                </div>
              </div>
            </div>

            <div className="row g-2 g-md-3">
              {!loading && items.length === 0 && (
                <p className="text-muted small col-12">{t('marketplace.partnerStorefrontEmpty')}</p>
              )}
              {items.map((l) => (
                <div className="col-6 col-md-4 col-xl-3" key={l.id}>
                  <div
                    className="card border-warning shadow-sm h-100 ta-premium-pane ta-marketplace-listing-card ta-marketplace-listing-card-clickable"
                    onClick={(ev) => {
                      if (ev.target.closest('a, button')) return
                      navigate(`/marketplace/listing/${l.id}`)
                    }}
                    role="presentation"
                  >
                    <img
                      src={partnerListingImageUrl(l.imageUrl) || '/spider-default.png'}
                      alt={decodeListingTitle(l.title)}
                      className="card-img-top"
                      style={{ maxHeight: 160, objectFit: 'cover' }}
                      loading="lazy"
                      onError={(e) => { e.currentTarget.src = '/spider-default.png' }}
                    />
                    <div className="card-body">
                      <h6 className="fw-bold d-flex align-items-center gap-2 flex-wrap">
                        <OfficialPartnerShield width={20} height={22} />
                        <span className="text-truncate">{decodeListingTitle(l.title)}</span>
                      </h6>
                      <div className="d-flex flex-wrap gap-1 mb-2">
                        <span className="badge bg-warning text-dark">{partnerBadge(l)}</span>
                        {l.promoted && (
                          <span className="badge bg-dark text-warning border border-warning">
                            {t('marketplace.tarantulaCribsBadge')}
                          </span>
                        )}
                      </div>
                      <div className="fw-semibold mb-2">
                        {l.priceAmount != null
                          ? `${l.priceAmount} ${l.currency || ''}`.trim()
                          : t('marketplace.priceOnRequest')}
                      </div>
                      <div className="d-flex gap-2 flex-wrap">
                        <button type="button" className="btn btn-sm btn-warning" onClick={(ev) => addLine(l, ev)}>
                          {t('marketplace.partnerAddToCart')}
                        </button>
                        <Link
                          to={`/marketplace/listing/${l.id}`}
                          className="btn btn-sm btn-outline-warning"
                          onClick={(ev) => ev.stopPropagation()}
                        >
                          {t('marketplace.partnerStorefrontViewItem')}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {vendor?.websiteUrl && (
        <div className="ta-partner-storefront-website-bar py-2 px-3 mt-3">
          <div className="container ta-premium-shell d-flex flex-wrap align-items-center justify-content-between gap-2">
            <span className="small text-muted">{t('marketplace.partnerStorefrontWebsiteHint')}</span>
            <a
              href={vendor.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-sm btn-outline-light"
            >
              {t('marketplace.partnerStorefrontVisitWebsite', { name: vendor.name })}
            </a>
          </div>
        </div>
      )}

      <PartnerCartBar />
    </div>
  )
}
