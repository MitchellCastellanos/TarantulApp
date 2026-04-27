import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import marketplaceService from '../services/marketplaceService'
import moderationService from '../services/moderationService'
import { imgUrl } from '../services/api'
import OfficialPartnerShield from '../components/OfficialPartnerShield'
import PublicKeeperHandle from '../components/PublicKeeperHandle'
import { usePageSeo } from '../hooks/usePageSeo'

function listingGalleryUrls(listing) {
  const raw = listing?.imageUrls
  if (Array.isArray(raw) && raw.length > 0) return raw.map((u) => String(u || '').trim()).filter(Boolean)
  const single = listing?.imageUrl
  if (single) return [single]
  return []
}

function formatListedAt(iso, locale) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(locale || undefined, { dateStyle: 'medium' })
  } catch {
    return ''
  }
}

export default function MarketplaceListingDetailPage() {
  const { listingId } = useParams()
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [photoIdx, setPhotoIdx] = useState(0)

  const locale = i18n.language?.startsWith('es') ? 'es-MX' : 'en-US'

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    marketplaceService
      .getPublicListing(listingId)
      .then((data) => {
        if (!cancelled) {
          setPayload(data)
          setPhotoIdx(0)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPayload(null)
          setError(err?.response?.status === 404 ? 'notfound' : 'load')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [listingId])

  const listing = payload?.listing
  const related = Array.isArray(payload?.relatedListings) ? payload.relatedListings : []
  const sellerPreview = payload?.sellerPreview || null

  const images = useMemo(() => {
    if (!listing) return []
    return listingGalleryUrls(listing).map((u) => imgUrl(u) || u)
  }, [listing])

  const activeImg = images.length > 0 ? images[Math.min(photoIdx, images.length - 1)] : null

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const seoTitle = listing?.title ? `${listing.title} ù ${t('marketplace.nav')}` : t('marketplace.nav')
  const seoDesc =
    listing?.description?.trim() ||
    [listing?.speciesName, listing?.city, listing?.country].filter(Boolean).join(' ù ') ||
    t('marketplace.metaDescription')

  usePageSeo({
    title: seoTitle,
    description: seoDesc.slice(0, 320),
    imageUrl: activeImg && String(activeImg).startsWith('http') ? activeImg : origin ? `${origin}/icon-512.png` : undefined,
    canonicalHref: origin && listingId ? `${origin}/marketplace/listing/${listingId}` : undefined,
    jsonLd:
      listing && origin
        ? {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: listing.title,
            description: listing.description || undefined,
            image: activeImg || undefined,
            offers:
              listing.priceAmount != null
                ? {
                    '@type': 'Offer',
                    priceCurrency: listing.currency || 'USD',
                    price: String(listing.priceAmount),
                  }
                : undefined,
          }
        : null,
    jsonLdId: 'marketplace-listing-detail-jsonld',
  })

  const reportListing = async () => {
    if (!listing?.id) return
    const reason = window.prompt(t('marketplace.reportReason'))
    if (!reason || !reason.trim()) return
    await moderationService.reportMarketplaceListing(listing.id, { reason: reason.trim(), details: '' })
    setMessage(t('marketplace.reportSent'))
  }

  const isPartner = listing && (listing.source === 'partner' || listing.isPartner)
  const sellerId = listing?.sellerUserId
  const canMessage = sellerId && user && String(user.id) !== String(sellerId)
  const chatHref =
    sellerId && listing?.id
      ? `/marketplace/messages?openSeller=${encodeURIComponent(sellerId)}&openListing=${encodeURIComponent(listing.id)}`
      : null

  return (
    <>
      <Navbar />
      <div className="container py-4 ta-marketplace-detail-page">
        <nav className="ta-marketplace-detail-breadcrumb" aria-label="breadcrumb">
          <ol className="breadcrumb ta-marketplace-detail-breadcrumb__list small mb-0">
            <li className="breadcrumb-item">
              <Link to="/marketplace" className="ta-marketplace-detail-breadcrumb__back">
                {t('marketplace.listingDetailBack')}
              </Link>
            </li>
            <li className="breadcrumb-item active text-truncate" aria-current="page">
              {loading ? 'Ö' : listing?.title || 'ó'}
            </li>
          </ol>
        </nav>

        {message && (
          <div className="alert alert-success py-2 small mb-3" role="status">
            {message}
          </div>
        )}

        {loading && <p className="text-muted">{t('common.loading')}</p>}
        {!loading && error === 'notfound' && <p className="text-muted">{t('marketplace.listingDetailNotFound')}</p>}
        {!loading && error === 'load' && <p className="text-muted">{t('marketplace.listingDetailLoadError')}</p>}
        {!loading && !error && listing && (
          <div className="row g-4">
            <div className="col-lg-8">
              <div className="ta-premium-pane rounded-3 overflow-hidden border border-secondary border-opacity-25 mb-3">
                <div
                  className="position-relative bg-dark bg-opacity-25 d-flex justify-content-center align-items-center"
                  style={{ minHeight: 280 }}
                >
                  {activeImg ? (
                    <img
                      src={activeImg}
                      alt=""
                      className="w-100"
                      style={{ maxHeight: 520, objectFit: 'contain' }}
                    />
                  ) : (
                    <img src="/spider-default.png" alt="" className="p-5 opacity-50" style={{ maxHeight: 280 }} />
                  )}
                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        className="btn btn-dark btn-sm position-absolute top-50 start-0 translate-middle-y ms-2 opacity-75"
                        aria-label={t('marketplace.listingDetailPrevPhoto')}
                        onClick={() => setPhotoIdx((i) => (i - 1 + images.length) % images.length)}
                      >
                        ?
                      </button>
                      <button
                        type="button"
                        className="btn btn-dark btn-sm position-absolute top-50 end-0 translate-middle-y me-2 opacity-75"
                        aria-label={t('marketplace.listingDetailNextPhoto')}
                        onClick={() => setPhotoIdx((i) => (i + 1) % images.length)}
                      >
                        ?
                      </button>
                      <div className="position-absolute bottom-0 start-50 translate-middle-x mb-2 px-2 py-1 rounded-pill bg-dark bg-opacity-50 small text-white">
                        {photoIdx + 1} / {images.length}
                      </div>
                    </>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="d-flex gap-2 p-2 flex-wrap justify-content-center border-top border-secondary border-opacity-25">
                    {images.map((src, i) => (
                      <button
                        key={`${src}-${i}`}
                        type="button"
                        className="p-0 border-0 bg-transparent rounded-1 overflow-hidden"
                        style={{
                          width: 72,
                          height: 54,
                          outline: i === photoIdx ? '2px solid var(--ta-gold-classic)' : 'none',
                        }}
                        onClick={() => setPhotoIdx(i)}
                      >
                        <img src={src} alt="" className="w-100 h-100" style={{ objectFit: 'cover' }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-3">
                <h1 className="h4 fw-bold mb-2 d-flex align-items-center gap-2 flex-wrap">
                  {isPartner && <OfficialPartnerShield width={26} height={28} />}
                  <span>{listing.title}</span>
                  {listing.boosted && (
                    <span className="badge bg-warning text-dark">{t('marketplace.boostedBadge')}</span>
                  )}
                  {isPartner && (
                    <span
                      className={`badge ${String(listing.partnerProgramTier) === 'STRATEGIC_FOUNDER' ? 'bg-dark text-warning' : 'bg-warning text-dark'}`}
                    >
                      {String(listing.partnerProgramTier) === 'STRATEGIC_FOUNDER'
                        ? t('marketplace.foundingPartnerBadge')
                        : listing.badgeLabel || t('marketplace.certifiedPartnerBadge')}
                    </span>
                  )}
                </h1>
                <p className="h5 fw-semibold mb-0" style={{ color: 'var(--ta-gold-light-classic, #e8d4a8)' }}>
                  {listing.priceAmount != null
                    ? `${listing.priceAmount} ${listing.currency || ''}`.trim()
                    : t('marketplace.priceOnRequest')}
                </p>
              </div>

              <dl className="row small mb-3 g-2">
                <dt className="col-sm-3 text-muted">{t('marketplace.fieldSpecies')}</dt>
                <dd className="col-sm-9 mb-0">{listing.speciesName || 'ù'}</dd>
                {!isPartner && (listing.stage || listing.sex) && (
                  <>
                    <dt className="col-sm-3 text-muted">{t('stages.label')} / {t('sex.label')}</dt>
                    <dd className="col-sm-9 mb-0">
                      {[listing.stage, listing.sex].filter(Boolean).join(' ù ') || 'ù'}
                    </dd>
                  </>
                )}
                <dt className="col-sm-3 text-muted">{t('marketplace.listingDetailLocation')}</dt>
                <dd className="col-sm-9 mb-0">
                  {[listing.city, listing.state, listing.country].filter(Boolean).join(' ù ') || 'ù'}
                </dd>
                <dt className="col-sm-3 text-muted">{t('marketplace.listingDetailListedOn')}</dt>
                <dd className="col-sm-9 mb-0">{formatListedAt(listing.createdAt, locale)}</dd>
                {isPartner && listing.stockQuantity != null && (
                  <>
                    <dt className="col-sm-3 text-muted">{t('marketplace.listingDetailStock')}</dt>
                    <dd className="col-sm-9 mb-0">{String(listing.stockQuantity)}</dd>
                  </>
                )}
                {isPartner && listing.availability && (
                  <>
                    <dt className="col-sm-3 text-muted">{t('marketplace.listingDetailInventory')}</dt>
                    <dd className="col-sm-9 mb-0 text-capitalize">{String(listing.availability).replace(/_/g, ' ')}</dd>
                  </>
                )}
              </dl>

              <h2 className="h6 fw-bold text-uppercase small letter-spacing mb-2" style={{ opacity: 0.85 }}>
                {t('marketplace.listingDetailDescription')}
              </h2>
              <p className="mb-0" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {listing.description?.trim() || 'ù'}
              </p>

              {!isPartner && listing.pedigreeRef && (
                <p className="small text-muted mt-3 mb-0">
                  {t('marketplace.fieldPedigree')}: {listing.pedigreeRef}
                </p>
              )}
            </div>

            <div className="col-lg-4">
              <div className="card border-secondary border-opacity-25 shadow-sm ta-premium-pane mb-3">
                <div className="card-body">
                  {!isPartner && sellerId && (
                    <>
                      <h3 className="h6 fw-bold mb-3">{t('marketplace.communitySubtitle')}</h3>
                      {sellerPreview?.handle ? (
                        <div className="mb-2">
                          <PublicKeeperHandle
                            handle={sellerPreview.handle}
                            displayName={sellerPreview.displayName || 'keeper'}
                            profilePhoto={sellerPreview.profilePhoto || null}
                            linkClassName="text-decoration-none fw-semibold ta-marketplace-keeper-link"
                          />
                        </div>
                      ) : (
                        <p className="fw-semibold mb-2">{sellerPreview?.displayName || listing.sellerName || 'Keeper'}</p>
                      )}
                      {(sellerPreview?.ratingAvg > 0 || sellerPreview?.reviewsCount > 0) && (
                        <p className="small text-muted mb-3">
                          {t('marketplace.rating')}: {sellerPreview.ratingAvg?.toFixed?.(1) ?? sellerPreview.ratingAvg} ù{' '}
                          {sellerPreview.reviewsCount} {t('marketplace.reviews').toLowerCase()}
                        </p>
                      )}
                      <div className="d-grid gap-2">
                        <Link
                          className="btn ta-marketplace-view-profile-btn btn-sm"
                          to={
                            sellerPreview?.handle
                              ? `/u/${encodeURIComponent(sellerPreview.handle)}`
                              : `/marketplace/keeper/${sellerId}`
                          }
                        >
                          {t('marketplace.viewSeller')}
                        </Link>
                        {!user ? (
                          <Link
                            className="btn btn-dark btn-sm"
                            to="/login"
                            state={{ redirectAfterAuth: chatHref }}
                          >
                            {t('marketplace.messageSeller')}
                          </Link>
                        ) : canMessage ? (
                          <Link className="btn btn-dark btn-sm" to={chatHref}>
                            {t('marketplace.messageSeller')}
                          </Link>
                        ) : null}
                        {chatHref && <p className="small text-muted mb-0">{t('marketplace.listingDetailOpenChatHint')}</p>}
                      </div>
                    </>
                  )}

                  {isPartner && (
                    <>
                      <h3 className="h6 fw-bold mb-2">{listing.officialVendor?.name || listing.sellerName}</h3>
                      {listing.officialVendor?.websiteUrl && (
                        <a
                          href={listing.officialVendor.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline-secondary btn-sm w-100 mb-2"
                        >
                          {t('marketplace.listingDetailVisitStore')}
                        </a>
                      )}
                      {listing.canonicalUrl && (
                        <a href={listing.canonicalUrl} target="_blank" rel="noreferrer" className="btn btn-dark btn-sm w-100">
                          {t('marketplace.listingDetailOfficialCta')}
                        </a>
                      )}
                    </>
                  )}

                  {!isPartner && user && sellerId && String(user.id) !== String(sellerId) && (
                    <button type="button" className="btn btn-link btn-sm text-muted p-0 mt-3" onClick={reportListing}>
                      {t('marketplace.report')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && listing && related.length > 0 && (
          <section className="mt-5 pt-4 border-top border-secondary border-opacity-25">
            <h2 className="h5 fw-bold mb-3">
              {isPartner ? t('marketplace.listingDetailRelatedPartner') : t('marketplace.listingDetailRelatedPeer')}
            </h2>
            <div className="row g-3">
              {related.map((rel) => (
                <div className="col-6 col-md-4 col-xl-3" key={rel.id}>
                  <Link
                    to={`/marketplace/listing/${rel.id}`}
                    className="text-decoration-none text-reset d-block h-100 card border-secondary border-opacity-25 shadow-sm ta-premium-pane ta-marketplace-detail-related-card"
                  >
                    {(rel.imageUrl || rel.imageUrls?.[0]) && (
                      <img
                        src={imgUrl(rel.imageUrl || rel.imageUrls[0]) || rel.imageUrl || rel.imageUrls[0]}
                        alt=""
                        className="card-img-top"
                        style={{ maxHeight: 120, objectFit: 'cover' }}
                      />
                    )}
                    <div className="card-body p-2">
                      <div className="small fw-semibold text-truncate">{rel.title}</div>
                      <div className="small text-muted">
                        {rel.priceAmount != null ? `${rel.priceAmount} ${rel.currency || ''}` : t('marketplace.priceOnRequest')}
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
