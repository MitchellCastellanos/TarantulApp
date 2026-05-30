import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import VerifiedVendorBadge from '../components/VerifiedVendorBadge'
import marketplaceService from '../services/marketplaceService'
import { imgUrl } from '../services/api'
import { usePageSeo } from '../hooks/usePageSeo'
import { trackListingEvent, trackStorefrontEvent } from '../utils/listingEventTracker'

export default function MarketplaceStorefrontPage() {
  const { handle } = useParams()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payload, setPayload] = useState(null)

  const seller = payload?.seller || null
  const profile = seller?.profile || {}
  const activeListings = Array.isArray(seller?.activeListings) ? seller.activeListings : []
  const storefrontTitle = profile?.storefrontName || seller?.displayName || 'Keeper'
  const metrics = seller?.storefrontMetrics || {}

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const canonical = origin && handle ? `${origin}/shop/${encodeURIComponent(handle)}` : undefined
  const title = storefrontTitle
    ? `${storefrontTitle} · ${t('marketplace.storefrontTitle')}`
    : t('marketplace.storefrontTitle')
  const desc = profile?.bio || t('marketplace.storefrontSubtitle')
  usePageSeo({
    title,
    description: desc,
    imageUrl: origin ? `${origin}/icon-512.png` : undefined,
    canonicalHref: canonical,
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    marketplaceService
      .getStorefrontByHandle(handle || '')
      .then((data) => {
        if (!cancelled) {
          setPayload(data || null)
          const h = (handle || '').trim().toLowerCase()
          if (h) {
            trackStorefrontEvent('peer', h, 'storefront_view', {
              country: data?.seller?.profile?.country,
            })
          }
        }
      })
      .catch((err) => {
        if (cancelled) return
        setPayload(null)
        setError(err?.response?.status === 404 ? 'notfound' : 'load')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [handle])

  const location = useMemo(
    () => [profile?.city, profile?.state, profile?.country].filter(Boolean).join(' · '),
    [profile?.city, profile?.country, profile?.state],
  )

  return (
    <div className="ta-premium-page">
      <Navbar />
      <div className="container mt-4 ta-premium-shell">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
          <div>
            <Link to="/marketplace" className="btn btn-sm btn-outline-secondary mb-2">{t('marketplace.listingDetailBack')}</Link>
            <h1 className="h4 mb-1">{t('marketplace.storefrontTitle')}</h1>
            <p className="small text-muted mb-0">{t('marketplace.storefrontSubtitle')}</p>
          </div>
        </div>

        {loading && <p className="text-muted small">{t('common.loading')}</p>}
        {!loading && error === 'notfound' && <p className="text-muted small">{t('marketplace.storefrontNotFound')}</p>}
        {!loading && error === 'load' && <p className="text-muted small">{t('marketplace.storefrontLoadError')}</p>}

        {!loading && !error && seller && (
          <>
            <div className="card border-0 shadow-sm ta-premium-pane mb-3">
              <div className="card-body">
                <div className="d-flex align-items-start gap-3 mb-2">
                  <img
                    src={profile?.origin?.logoUrl || imgUrl(profile?.profilePhoto) || '/spider-default.png'}
                    alt={`@${payload?.storefrontHandle || handle || 'keeper'}`}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: profile?.origin?.logoUrl ? 12 : 999,
                      objectFit: profile?.origin?.logoUrl ? 'contain' : 'cover',
                      background: profile?.origin?.logoUrl ? '#fff' : undefined,
                    }}
                  />
                  <div className="min-w-0 flex-grow-1">
                    <div className="h5 fw-bold mb-0">{storefrontTitle}</div>
                    <div className="small text-muted">@{payload?.storefrontHandle || handle || 'keeper'}</div>
                    {(profile?.origin?.verified || profile?.storefrontVerified) ? (
                      <div className="mt-1">
                        <VerifiedVendorBadge origin={profile?.origin} showTooltip />
                      </div>
                    ) : profile?.verifiedBreeder ? (
                      <span className="badge bg-info-subtle text-dark border mt-1">{t('marketplace.verifiedBreederBadge')}</span>
                    ) : null}
                    {profile?.storefrontTagline ? <div className="small mt-1">{profile.storefrontTagline}</div> : null}
                    {location && <div className="small text-muted mt-1">{location}</div>}
                  </div>
                  <div className="small text-muted text-end">
                    <div>{t('marketplace.rating')}: {seller.ratingAvg ?? 0}</div>
                    <div>{seller.reviewsCount ?? 0} {t('marketplace.reviews').toLowerCase()}</div>
                  </div>
                </div>
                <p className="small mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                  {profile?.bio || t('marketplace.noBio')}
                </p>
                {(profile?.storefrontShippingPolicy || profile?.storefrontLagPolicy) && (
                  <div className="row g-2 mt-2">
                    {profile?.storefrontShippingPolicy && (
                      <div className="col-md-6">
                        <div className="small fw-semibold">{t('marketplace.storefrontShippingPolicyLabel')}</div>
                        <p className="small mb-0 text-muted" style={{ whiteSpace: 'pre-wrap' }}>
                          {profile.storefrontShippingPolicy}
                        </p>
                      </div>
                    )}
                    {profile?.storefrontLagPolicy && (
                      <div className="col-md-6">
                        <div className="small fw-semibold">{t('marketplace.storefrontLagPolicyLabel')}</div>
                        <p className="small mb-0 text-muted" style={{ whiteSpace: 'pre-wrap' }}>
                          {profile.storefrontLagPolicy}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {(profile?.contactWhatsapp || profile?.contactInstagram) && (
                  <div className="d-flex flex-wrap gap-2 mt-3">
                    {profile?.contactWhatsapp && (
                      <a className="btn btn-sm btn-outline-dark" href={`https://wa.me/${String(profile.contactWhatsapp).replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer">
                        WhatsApp
                      </a>
                    )}
                    {profile?.contactInstagram && (
                      <a className="btn btn-sm btn-outline-secondary" href={`https://instagram.com/${String(profile.contactInstagram).replace(/^@/, '')}`} target="_blank" rel="noreferrer">
                        Instagram
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="card border-0 shadow-sm ta-premium-pane mb-3">
              <div className="card-body">
                <h3 className="h6 mb-2">{t('marketplace.storefrontMetricsTitle')}</h3>
                <div className="row g-2 small">
                  <div className="col-6 col-md-3"><strong>{metrics.totalListings ?? 0}</strong> · {t('marketplace.metricTotalListings')}</div>
                  <div className="col-6 col-md-3"><strong>{metrics.activeListings ?? 0}</strong> · {t('marketplace.metricActiveListings')}</div>
                  <div className="col-6 col-md-3"><strong>{metrics.soldListings ?? 0}</strong> · {t('marketplace.metricSoldListings')}</div>
                  <div className="col-6 col-md-3"><strong>{metrics.responseRatePct ?? 0}%</strong> · {t('marketplace.metricResponseRate')}</div>
                </div>
              </div>
            </div>

            <div className="mb-2 pb-2 border-bottom" style={{ borderColor: 'var(--ta-border)' }}>
              <h2 className="h6 mb-1">{t('marketplace.activeListings')}</h2>
              <p className="small text-muted mb-0">{t('marketplace.storefrontListingsSub')}</p>
            </div>

            <div className="row g-2 g-md-3">
              {activeListings.length === 0 && (
                <p className="text-muted small">{t('marketplace.empty')}</p>
              )}
              {activeListings.map((l) => (
                <div className="col-6 col-md-4 col-xl-3" key={l.id}>
                  <Link
                    to={`/marketplace/listing/${l.id}`}
                    className="card border-0 shadow-sm h-100 ta-premium-pane ta-marketplace-listing-card text-decoration-none"
                    onClick={() => trackListingEvent(l.id, 'card_click', { country: l.country })}
                  >
                    <img
                      src={imgUrl(l.imageUrl) || l.imageUrl || '/spider-default.png'}
                      alt={l.title}
                      className="card-img-top"
                      style={{ maxHeight: 160, objectFit: 'cover' }}
                    />
                    <div className="card-body">
                      <h6 className="fw-bold mb-1 text-body">{l.title}</h6>
                      <p className="small text-muted mb-1">{l.speciesName || '-'}</p>
                      <div className="small text-muted mb-2">{[l.city, l.state, l.country].filter(Boolean).join(' · ') || '-'}</div>
                      <div className="fw-semibold text-body">
                        {l.priceAmount != null ? `${l.priceAmount} ${l.currency || ''}` : t('marketplace.priceOnRequest')}
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
