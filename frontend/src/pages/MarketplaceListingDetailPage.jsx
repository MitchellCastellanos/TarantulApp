import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import VerifiedVendorBadge from '../components/VerifiedVendorBadge'
import ResponseBadge from '../components/ResponseBadge'
import { useAuth } from '../context/AuthContext'
import marketplaceService from '../services/marketplaceService'
import moderationService from '../services/moderationService'
import { imgUrl } from '../services/api'
import {
  decodeListingText,
  decodeListingTitle,
  LISTING_EMPTY_PLACEHOLDER,
  LISTING_META_SEP,
  partnerListingImageUrl,
} from '../utils/listingDisplay'
import OfficialPartnerShield from '../components/OfficialPartnerShield'
import PublicKeeperHandle from '../components/PublicKeeperHandle'
import { usePageSeo } from '../hooks/usePageSeo'
import PartnerCartBar from '../components/PartnerCartBar'
import { addPartnerCartLine, MONARCH_VENDOR_SLUG } from '../utils/partnerCart'
import { partnerStorefrontPath, vendorHasInAppStorefront } from '../utils/partnerStorefront'
import ListingShareKit from '../components/ListingShareKit'
import SpeciesTradeNoteBlock from '../components/SpeciesTradeNoteBlock'
import { trackListingEvent } from '../utils/listingEventTracker'
import { formatListingPrice } from '../utils/formatPrice'

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
  const [shareOpen, setShareOpen] = useState(false)
  const [reviewEligibility, setReviewEligibility] = useState(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)

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
          trackListingEvent(listingId, 'view')
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

  useEffect(() => {
    if (!user?.id || !listingId) {
      setReviewEligibility(null)
      return
    }
    marketplaceService
      .getReviewEligibility(listingId)
      .then(setReviewEligibility)
      .catch(() => setReviewEligibility(null))
  }, [user?.id, listingId])

  const listing = payload?.listing
  const displayTitle = listing?.title ? decodeListingTitle(listing.title) : ''
  const displayDescription = listing?.description ? decodeListingText(listing.description) : ''
  const related = Array.isArray(payload?.relatedListings) ? payload.relatedListings : []
  const sellerPreview = payload?.sellerPreview || null

  const images = useMemo(() => {
    if (!listing) return []
    const partner = listing.source === 'partner' || listing.isPartner
    return listingGalleryUrls(listing).map((u) => (partner ? partnerListingImageUrl(u) : imgUrl(u)) || u)
  }, [listing])

  const activeImg = images.length > 0 ? images[Math.min(photoIdx, images.length - 1)] : null

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const seoTitle = displayTitle ? `${displayTitle}${LISTING_META_SEP}${t('marketplace.nav')}` : t('marketplace.nav')
  const seoDesc =
    displayDescription?.trim() ||
    [listing?.speciesName, listing?.city, listing?.country].filter(Boolean).join(LISTING_META_SEP) ||
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
  const sellerHandle = listing?.sellerHandle
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
              {loading ? '' : displayTitle || listing?.title || ''}
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
                        ‹
                      </button>
                      <button
                        type="button"
                        className="btn btn-dark btn-sm position-absolute top-50 end-0 translate-middle-y me-2 opacity-75"
                        aria-label={t('marketplace.listingDetailNextPhoto')}
                        onClick={() => setPhotoIdx((i) => (i + 1) % images.length)}
                      >
                        ›
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
                  <span>{displayTitle || listing.title}</span>
                  {listing.sellerVerifiedBreeder && (
                    <span className="badge bg-info-subtle text-dark border">{t('marketplace.verifiedBreederBadge')}</span>
                  )}
                  {listing.boosted && (
                    <span className="badge bg-warning text-dark">{t('marketplace.boostedBadge')}</span>
                  )}
                  {isPartner && (
                    <span className="badge bg-warning text-dark">
                      {listing.isFoundingPartner || listing.partnerProgramTier === 'STRATEGIC_FOUNDER'
                        ? t('marketplace.foundingPartnerBadge')
                        : (listing.badgeLabel || t('marketplace.certifiedPartnerBadge'))}
                    </span>
                  )}
                  {isPartner && listing.promoted && (
                    <span className="badge bg-dark text-warning border border-warning">
                      {t('marketplace.tarantulaCribsBadge')}
                    </span>
                  )}
                </h1>
                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <p className="h5 fw-semibold mb-0" style={{ color: 'var(--ta-gold-light-classic, #e8d4a8)' }}>
                    {formatListingPrice(listing.priceAmount, listing.currency, t)}
                  </p>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      trackListingEvent(listingId, 'share_open', { force: true })
                      setShareOpen(true)
                    }}
                    aria-label={t('share.listing.title')}
                  >
                    {t('share.listing.button')}
                  </button>
                </div>
              </div>

              <dl className="row small mb-3 g-2">
                <dt className="col-sm-3 text-muted">{t('marketplace.fieldSpecies')}</dt>
                <dd className="col-sm-9 mb-0">{listing.speciesName || LISTING_EMPTY_PLACEHOLDER}</dd>
                {!isPartner && (listing.stage || listing.sex) && (
                  <>
                    <dt className="col-sm-3 text-muted">{t('stages.label')} / {t('sex.label')}</dt>
                    <dd className="col-sm-9 mb-0">
                      {[listing.stage, listing.sex].filter(Boolean).join(LISTING_META_SEP) || LISTING_EMPTY_PLACEHOLDER}
                    </dd>
                  </>
                )}
                <dt className="col-sm-3 text-muted">{t('marketplace.listingDetailLocation')}</dt>
                <dd className="col-sm-9 mb-0">
                  {[listing.city, listing.state, listing.country].filter(Boolean).join(LISTING_META_SEP) || LISTING_EMPTY_PLACEHOLDER}
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
                {displayDescription?.trim() || LISTING_EMPTY_PLACEHOLDER}
              </p>

              {!isPartner && listing.pedigreeRef && (
                <p className="small text-muted mt-3 mb-0">
                  {t('marketplace.fieldPedigree')}: {listing.pedigreeRef}
                </p>
              )}

              {!isPartner && listing.sellerTradeDisclosureAcceptedAt && (
                <section
                  className="mt-4 p-3 rounded border border-secondary border-opacity-25 small"
                  style={{ background: 'rgba(0,0,0,0.03)' }}
                >
                  <h3 className="h6 fw-bold mb-2">{t('marketplace.listingDetailTradeTitle')}</h3>
                  <p className="text-muted mb-2 mb-md-3">
                    {t('marketplace.listingDetailCertifiedAt')}:{' '}
                    <time dateTime={String(listing.sellerTradeDisclosureAcceptedAt)}>
                      {formatListedAt(listing.sellerTradeDisclosureAcceptedAt, locale)}
                    </time>
                  </p>
                  <p className="mb-2 mb-md-3">
                    {listing.wildCaught
                      ? t('marketplace.listingDetailWildCaught')
                      : t('marketplace.listingDetailCaptiveBred')}
                    {listing.wildCaught && listing.captureOriginCountryIso ? (
                      <>
                        {' '}
                        — {t('marketplace.listingDetailCaptureCountry')}:{' '}
                        <strong>{String(listing.captureOriginCountryIso)}</strong>
                      </>
                    ) : null}
                  </p>
                  {listing.regulatoryPermitRefs ? (
                    <div>
                      <div className="text-muted mb-1">{t('marketplace.listingDetailRegulatoryRefs')}</div>
                      <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                        {listing.regulatoryPermitRefs}
                      </p>
                    </div>
                  ) : null}
                  {listing.speciesTradeNote ? (
                    <div className="mt-3">
                      <SpeciesTradeNoteBlock
                        note={listing.speciesTradeNote}
                        countryLabel={listing.country}
                      />
                    </div>
                  ) : null}
                </section>
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
                        <p className="small text-muted mb-2">
                          {t('marketplace.rating')}: {sellerPreview.ratingAvg?.toFixed?.(1) ?? sellerPreview.ratingAvg}
                          {LISTING_META_SEP}
                          {sellerPreview.reviewsCount} {t('marketplace.reviews').toLowerCase()}
                        </p>
                      )}
                      <div className="d-flex flex-wrap gap-2 mb-3">
                        {listing.sellerVerifiedBreeder ? (
                          <VerifiedVendorBadge showTooltip />
                        ) : null}
                        <ResponseBadge
                          badge={sellerPreview?.responseBadge}
                          avgResponseHours={sellerPreview?.avgResponseHours}
                        />
                      </div>
                      <div className="d-grid gap-2">
                        {sellerHandle ? (
                          <Link
                            className="btn btn-sm btn-outline-dark"
                            to={`/shop/${encodeURIComponent(sellerHandle)}`}
                            onClick={() => trackListingEvent(listingId, 'contact_tap')}
                          >
                            {t('marketplace.listingDetailVisitStore')}
                          </Link>
                        ) : null}
                        <Link
                          className="btn ta-marketplace-view-profile-btn btn-sm"
                          to={
                            sellerPreview?.handle
                              ? `/u/${encodeURIComponent(sellerPreview.handle)}`
                              : `/marketplace/keeper/${sellerId}`
                          }
                          onClick={() => trackListingEvent(listingId, 'contact_tap')}
                        >
                          {t('marketplace.viewSeller')}
                        </Link>
                        {!user ? (
                          <Link
                            className="btn btn-dark btn-sm"
                            to="/login"
                            state={{ redirectAfterAuth: chatHref }}
                            onClick={() => trackListingEvent(listingId, 'contact_tap')}
                          >
                            {t('marketplace.messageSeller')}
                          </Link>
                        ) : canMessage ? (
                          <Link
                            className="btn btn-dark btn-sm"
                            to={chatHref}
                            onClick={() => trackListingEvent(listingId, 'contact_tap')}
                          >
                            {t('marketplace.messageSeller')}
                          </Link>
                        ) : null}
                        {chatHref && <p className="small text-muted mb-0">{t('marketplace.listingDetailOpenChatHint')}</p>}
                      </div>
                      {reviewEligibility?.eligible && sellerId && (
                        <div className="mt-3 pt-3 border-top">
                          <h4 className="h6 fw-semibold mb-2">{t('marketplace.review.promptTitle')}</h4>
                          <p className="small text-muted">{t('marketplace.review.promptBody')}</p>
                          <div className="mb-2">
                            <label className="form-label small mb-1" htmlFor="listing-review-rating">
                              {t('marketplace.review.ratingLabel')}
                            </label>
                            <select
                              id="listing-review-rating"
                              className="form-select form-select-sm"
                              value={reviewRating}
                              onChange={(e) => setReviewRating(Number(e.target.value))}
                            >
                              {[5, 4, 3, 2, 1].map((n) => (
                                <option key={n} value={n}>{n} ★</option>
                              ))}
                            </select>
                          </div>
                          <textarea
                            className="form-control form-control-sm mb-2"
                            rows={3}
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder={t('marketplace.review.commentPlaceholder')}
                          />
                          <button
                            type="button"
                            className="btn btn-sm btn-dark"
                            disabled={reviewSubmitting}
                            onClick={async () => {
                              setReviewSubmitting(true)
                              try {
                                await marketplaceService.addReview(sellerId, {
                                  listingId,
                                  rating: reviewRating,
                                  comment: reviewComment.trim(),
                                })
                                setMessage(t('marketplace.review.submitSuccess'))
                                setReviewEligibility({ eligible: false, alreadyReviewed: true })
                              } catch (err) {
                                setMessage(err?.response?.data?.message || t('marketplace.review.submitError'))
                              } finally {
                                setReviewSubmitting(false)
                              }
                            }}
                          >
                            {reviewSubmitting ? t('common.saving') : t('marketplace.review.submit')}
                          </button>
                        </div>
                      )}
                      <p className="small text-muted mt-3 mb-0">
                        {t('marketplace.listingLegalNotice')}{' '}
                        <Link to="/terms" target="_blank" rel="noreferrer">{t('auth.legalTerms')}</Link>
                        {' '}·{' '}
                        <Link to="/marketplace-policy" target="_blank" rel="noreferrer">{t('legal.marketplacePolicy.title')}</Link>
                      </p>
                      <div className="small text-muted mt-2">
                        <div className="fw-semibold mb-1">{t('marketplace.orderChecklistTitle')}</div>
                        <ul className="mb-0 ps-3">
                          <li>{t('marketplace.orderChecklistRule1')}</li>
                          <li>{t('marketplace.orderChecklistRule2')}</li>
                          <li>{t('marketplace.orderChecklistRule3')}</li>
                        </ul>
                      </div>
                    </>
                  )}

                  {isPartner && (
                    <>
                      <h3 className="h6 fw-bold mb-2 d-flex align-items-center gap-2 flex-wrap">
                        <OfficialPartnerShield width={22} height={24} />
                        <span>{listing.officialVendor?.name || listing.sellerName}</span>
                        {(listing.isFoundingPartner || listing.partnerProgramTier === 'STRATEGIC_FOUNDER') && (
                          <span className="badge bg-warning text-dark">{t('marketplace.foundingPartnerBadge')}</span>
                        )}
                        {listing.promoted && (
                          <span className="badge bg-dark text-warning border border-warning">
                            {t('marketplace.tarantulaCribsBadge')}
                          </span>
                        )}
                      </h3>
                      <button
                        type="button"
                        className="btn btn-warning btn-sm w-100 mb-2"
                        onClick={() => {
                          trackListingEvent(listingId, 'contact_tap')
                          addPartnerCartLine({
                            vendorSlug: listing.officialVendor?.slug || MONARCH_VENDOR_SLUG,
                            listingId: listing.id,
                            externalProductId: listing.partnerExternalId,
                            title: listing.title,
                            priceAmount: listing.priceAmount,
                            currency: listing.currency,
                            imageUrl: listing.imageUrl,
                            canonicalUrl: listing.canonicalUrl,
                            quantity: 1,
                          })
                          setMessage(t('marketplace.partnerCartAdded'))
                        }}
                      >
                        {t('marketplace.partnerAddToCart')}
                      </button>
                      {listing.officialVendor && vendorHasInAppStorefront(listing.officialVendor) && partnerStorefrontPath(listing.officialVendor.slug) ? (
                        <Link
                          to={partnerStorefrontPath(listing.officialVendor.slug)}
                          className="btn btn-warning btn-sm w-100 mb-2 fw-semibold"
                          onClick={() => trackListingEvent(listingId, 'contact_tap')}
                        >
                          {t('marketplace.partnerStorefrontOpenCta')}
                        </Link>
                      ) : null}
                      {listing.officialVendor?.websiteUrl && (
                        <a
                          href={listing.officialVendor.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline-secondary btn-sm w-100 mb-2"
                          onClick={() => trackListingEvent(listingId, 'contact_tap')}
                        >
                          {t('marketplace.partnerStorefrontVisitWebsite', {
                            name: listing.officialVendor?.name || listing.sellerName,
                          })}
                        </a>
                      )}
                      {listing.canonicalUrl && (
                        <a
                          href={listing.canonicalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-dark btn-sm w-100"
                          onClick={() => trackListingEvent(listingId, 'contact_tap')}
                        >
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
              {related.map((rel) => {
                const relRawImg = rel.imageUrl || rel.imageUrls?.[0]
                const relImg = isPartner
                  ? partnerListingImageUrl(relRawImg)
                  : imgUrl(relRawImg) || relRawImg
                return (
                <div className="col-6 col-md-4 col-xl-3" key={rel.id}>
                  <Link
                    to={`/marketplace/listing/${rel.id}`}
                    className="text-decoration-none text-reset d-block h-100 card border-secondary border-opacity-25 shadow-sm ta-premium-pane ta-marketplace-detail-related-card"
                  >
                    <img
                      src={relImg || '/spider-default.png'}
                      alt={decodeListingTitle(rel.title) || ''}
                      className="card-img-top ta-marketplace-detail-related-card__thumb"
                      loading="lazy"
                      onError={(e) => { e.currentTarget.src = '/spider-default.png' }}
                    />
                    <div className="card-body p-2">
                      <div className="small fw-semibold text-truncate">{decodeListingTitle(rel.title) || rel.title}</div>
                      <div className="small text-muted">
                        {formatListingPrice(rel.priceAmount, rel.currency, t)}
                      </div>
                    </div>
                  </Link>
                </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
      <PartnerCartBar />
      {shareOpen && listing && (
        <ListingShareKit
          listing={listing}
          sellerName={sellerPreview?.displayName || listing.sellerName}
          sellerHandle={sellerPreview?.handle || listing.sellerHandle}
          listingUrl={origin && listingId ? `${origin}/marketplace/listing/${listingId}` : ''}
          storeUrl={
            origin && (sellerPreview?.handle || listing.sellerHandle)
              ? `${origin}/shop/${encodeURIComponent(sellerPreview?.handle || listing.sellerHandle)}`
              : ''
          }
          imageUrl={activeImg}
          onClose={() => setShareOpen(false)}
        />
      )}
    </>
  )
}
