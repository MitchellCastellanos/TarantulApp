import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import marketplaceService from '../services/marketplaceService'
import moderationService from '../services/moderationService'
import { COUNTRY_OPTIONS, STATES_BY_COUNTRY, CITIES_BY_STATE } from '../constants/locations'
import { imgUrl } from '../services/api'
import BrandLogoMark from '../components/BrandLogoMark'
import OfficialPartnerShield from '../components/OfficialPartnerShield'
import PublicKeeperHandle from '../components/PublicKeeperHandle'
import { usePageSeo } from '../hooks/usePageSeo'

const EMPTY_PROFILE_FORM = {
  handle: '',
  bio: '',
  location: '',
  country: 'Mexico',
  state: '',
  city: '',
  featuredCollection: '',
  contactWhatsapp: '',
  contactInstagram: '',
  profilePhoto: '',
}

const EMPTY_VENDOR_LEAD_FORM = {
  businessName: '',
  contactName: '',
  contactEmail: '',
  websiteUrl: '',
  country: 'Mexico',
  state: '',
  city: '',
  shippingScope: 'national',
  note: '',
}

const OFFICIAL_STRIP_SCROLL_GAP_PX = 12

function getOfficialStripScrollStep(el) {
  if (!el) return 200
  const firstItem = el.querySelector('.ta-marketplace-official-strip__item')
  const w = firstItem ? firstItem.getBoundingClientRect().width : 200
  return w + OFFICIAL_STRIP_SCROLL_GAP_PX
}

export default function MarketplacePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [listings, setListings] = useState([])
  const [officialVendors, setOfficialVendors] = useState([])
  const [myProfile, setMyProfile] = useState(EMPTY_PROFILE_FORM)
  const [vendorLeadForm, setVendorLeadForm] = useState(EMPTY_VENDOR_LEAD_FORM)
  const [loading, setLoading] = useState(false)
  const [savingVendorLead, setSavingVendorLead] = useState(false)
  const [message, setMessage] = useState('')
  const [myReputation, setMyReputation] = useState(null)
  const [filters, setFilters] = useState({ country: '', state: '', city: '', nearMe: true })
  const officialStripScrollRef = useRef(null)
  const officialStripAutoplayPauseRef = useRef(() => {})
  const [officialStripEdge, setOfficialStripEdge] = useState({ atStart: true, atEnd: false })

  const updateOfficialStripEdges = useCallback(() => {
    const el = officialStripScrollRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    if (max < 8) {
      setOfficialStripEdge({ atStart: true, atEnd: true })
      return
    }
    const left = el.scrollLeft
    setOfficialStripEdge({
      atStart: left <= 6,
      atEnd: left >= max - 6,
    })
  }, [])

  const scrollOfficialStrip = useCallback((dir) => {
    officialStripAutoplayPauseRef.current()
    const el = officialStripScrollRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    if (maxScroll < 8) return
    const step = getOfficialStripScrollStep(el)
    const next = dir === 'next'
      ? Math.min(el.scrollLeft + step, maxScroll)
      : Math.max(el.scrollLeft - step, 0)
    el.scrollTo({ left: next, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const el = officialStripScrollRef.current
    if (!el || officialVendors.length <= 1) {
      setOfficialStripEdge({ atStart: true, atEnd: true })
      return undefined
    }
    updateOfficialStripEdges()
    el.addEventListener('scroll', updateOfficialStripEdges, { passive: true })
    const ro = new ResizeObserver(() => updateOfficialStripEdges())
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateOfficialStripEdges)
      ro.disconnect()
    }
  }, [officialVendors, updateOfficialStripEdges])
  const nearCountry = filters.nearMe ? (myProfile.country || user?.profileCountry || '') : undefined
  const nearState = filters.nearMe ? (myProfile.state || user?.profileState || '') : undefined
  const nearCity = filters.nearMe ? (myProfile.city || user?.profileCity || '') : undefined

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const mpJsonLd = useMemo(() => {
    if (!origin) return null
    return {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: t('marketplace.seoTitle'),
      description: t('marketplace.metaDescription'),
      url: `${origin}/marketplace`,
    }
  }, [t, origin])

  usePageSeo({
    title: t('marketplace.seoTitle'),
    description: t('marketplace.metaDescription'),
    imageUrl: origin ? `${origin}/icon-512.png` : undefined,
    canonicalHref: origin ? `${origin}/marketplace` : undefined,
    jsonLd: mpJsonLd,
    jsonLdId: 'marketplace-page-jsonld',
  })

  const loadPublicListings = async () => {
    try {
      const data = await marketplaceService.listPublic({
        q: query || undefined,
        country: filters.country || undefined,
        state: filters.state || undefined,
        city: filters.city || undefined,
        nearCountry,
        nearState,
        nearCity,
      })
      const normalized = Array.isArray(data) ? data : []
      setListings(normalized)
    } catch {
      setListings([])
    }
  }

  const loadOfficialVendors = async () => {
    const data = await marketplaceService.listOfficialVendors({
      q: query || undefined,
      country: filters.country || undefined,
      state: filters.state || undefined,
      city: filters.city || undefined,
      nearCountry,
      nearState,
      nearCity,
    })
    setOfficialVendors(Array.isArray(data) ? data : [])
  }

  const loadMine = async () => {
    if (!user) return
    const profile = await marketplaceService.getMyProfile()
    setMyProfile({
      handle: profile?.handle || '',
      bio: profile?.bio || '',
      location: profile?.location || '',
      country: profile?.country || user?.profileCountry || 'Mexico',
      state: profile?.state || user?.profileState || '',
      city: profile?.city || user?.profileCity || '',
      featuredCollection: profile?.featuredCollection || '',
      contactWhatsapp: profile?.contactWhatsapp || '',
      contactInstagram: profile?.contactInstagram || '',
      profilePhoto: profile?.profilePhoto || '',
    })
    setMyReputation(profile?.reputation || null)
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([loadPublicListings(), loadOfficialVendors(), loadMine().catch(() => {})])
      .finally(() => setLoading(false))
  }, [user?.id])

  useEffect(() => {
    const lb = searchParams.get('listingBoost')
    if (!lb) return
    if (lb === 'success') {
      setMessage(t('marketplace.listingBoostPaid'))
    } else if (lb === 'cancel') {
      setMessage(t('marketplace.listingBoostCancelled'))
    }
    const next = new URLSearchParams(searchParams)
    next.delete('listingBoost')
    next.delete('session_id')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams, t])

  /** Legacy links used `/marketplace?openSeller=` — send users to the inbox page. */
  useEffect(() => {
    const openSeller = searchParams.get('openSeller')
    if (!openSeller?.trim()) return
    const openListing = searchParams.get('openListing')
    const p = new URLSearchParams()
    p.set('openSeller', openSeller.trim())
    if (openListing?.trim()) p.set('openListing', openListing.trim())
    navigate(`/marketplace/messages?${p.toString()}`, { replace: true })
  }, [navigate, searchParams])

  useEffect(() => {
    Promise.all([loadPublicListings(), loadOfficialVendors()]).catch(() => {})
  }, [filters, query, myProfile.country, myProfile.state, myProfile.city])

  /** Certified partners strip: auto-advance like a carousel only on small viewports (clarity that more is off-screen). */
  useEffect(() => {
    const el = officialStripScrollRef.current
    if (!el || officialVendors.length <= 1) {
      officialStripAutoplayPauseRef.current = () => {}
      return
    }

    const mobileMq = window.matchMedia('(max-width: 767.98px)')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const intervalMs = 5000
    const pauseAfterInteractMs = 16_000
    let pauseUntil = 0
    let intervalId = null

    const canAuto = () => Date.now() >= pauseUntil

    const pause = () => {
      pauseUntil = Date.now() + pauseAfterInteractMs
    }
    officialStripAutoplayPauseRef.current = pause

    const advance = () => {
      if (!mobileMq.matches || reduceMotion.matches) return
      if (!canAuto()) return
      const maxScroll = el.scrollWidth - el.clientWidth
      if (maxScroll < 8) return
      const step = getOfficialStripScrollStep(el)
      const next = el.scrollLeft + step
      const atEnd = next >= maxScroll - 2
      el.scrollTo({ left: atEnd ? 0 : next, behavior: 'smooth' })
    }

    const syncInterval = () => {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
      if (mobileMq.matches && !reduceMotion.matches && officialVendors.length > 1) {
        intervalId = window.setInterval(advance, intervalMs)
      }
    }

    syncInterval()

    const onMEDIA = () => {
      syncInterval()
    }
    el.addEventListener('touchstart', pause, { passive: true })
    el.addEventListener('pointerdown', pause)
    el.addEventListener('wheel', pause, { passive: true })
    mobileMq.addEventListener('change', onMEDIA)
    reduceMotion.addEventListener('change', onMEDIA)
    return () => {
      if (intervalId) clearInterval(intervalId)
      officialStripAutoplayPauseRef.current = () => {}
      el.removeEventListener('touchstart', pause)
      el.removeEventListener('pointerdown', pause)
      el.removeEventListener('wheel', pause)
      mobileMq.removeEventListener('change', onMEDIA)
      reduceMotion.removeEventListener('change', onMEDIA)
    }
  }, [officialVendors])

  const visibleListings = useMemo(() => listings.filter((l) => l.status !== 'hidden'), [listings])
  const partnerListings = useMemo(
    () => visibleListings.filter((l) => l.source === 'partner' || l.isPartner),
    [visibleListings]
  )
  const peerListings = useMemo(
    () => visibleListings.filter((l) => l.source !== 'partner' && !l.isPartner),
    [visibleListings]
  )

  const reportListing = async (listingId) => {
    const reason = window.prompt(t('marketplace.reportReason'))
    if (!reason || !reason.trim()) return
    await moderationService.reportMarketplaceListing(listingId, { reason: reason.trim(), details: '' })
    setMessage(t('marketplace.reportSent'))
  }

  const submitOfficialLead = async (e) => {
    e.preventDefault()
    setSavingVendorLead(true)
    setMessage('')
    try {
      await marketplaceService.submitOfficialVendorLead(vendorLeadForm)
      setVendorLeadForm(EMPTY_VENDOR_LEAD_FORM)
      setMessage(t('marketplace.officialLeadSent'))
    } catch (err) {
      setMessage(err?.response?.data?.error || t('marketplace.error'))
    } finally {
      setSavingVendorLead(false)
    }
  }

  const availableStates = STATES_BY_COUNTRY[filters.country || myProfile.country || 'Mexico'] || []
  const filterCities = CITIES_BY_STATE[filters.state] || []
  return (
    <div className="ta-premium-page">
      <Navbar />
      <div className="container mt-4 ta-premium-shell">
        <h4 className="mb-3 ta-premium-title">{t('marketplace.title')}</h4>

        {message && <div className="alert alert-info small py-2">{message}</div>}

        <section className="ta-marketplace-official-strip mb-4" aria-label={t('marketplace.officialTitle')}>
          <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
            <div className="d-flex align-items-start gap-2 min-w-0">
              <span className="flex-shrink-0 ta-marketplace-official-strip-header-logo d-inline-flex align-items-center justify-content-center" aria-hidden>
                <BrandLogoMark size={44} showIntro={false} className="ta-marketplace-official-strip-header-logo__mark" />
              </span>
              <div className="min-w-0">
                <div className="small text-uppercase fw-bold mb-1" style={{ letterSpacing: '0.1em', color: 'var(--ta-gold-classic)' }}>
                  {t('marketplace.officialStripLabel')}
                </div>
                <p className="small mb-0" style={{ color: 'var(--ta-text-muted)', lineHeight: 1.45 }}>{t('marketplace.officialStripSub')}</p>
              </div>
            </div>
            <span className="ta-marketplace-official-strip__badge flex-shrink-0">{t('marketplace.officialBadge')}</span>
          </div>
          <div
            className={
              `ta-marketplace-official-strip__scroll-outer${officialVendors.length > 1 ? ' ta-marketplace-official-strip__scroll-outer--hint' : ''}`.trim()
            }
          >
            <div ref={officialStripScrollRef} className="ta-marketplace-official-strip__scroll">
              {officialVendors.length === 0 && (
                <p className="small text-muted mb-0 py-1">{t('marketplace.officialEmpty')}</p>
              )}
              {officialVendors.map((vendor) => (
                <div key={vendor.id} className="ta-marketplace-official-strip__item flex-shrink-0 d-flex">
                  <div className="official-vendor-card official-vendor-card--strip h-100 w-100 p-2 d-flex flex-column">
                    <div className="official-vendor-card__inner d-flex flex-column flex-grow-1">
                      <div className="flex-grow-1 min-h-0">
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <div className="min-w-0">
                            <div className="fw-semibold small">{vendor.name}</div>
                            <div className="small text-muted" style={{ fontSize: '0.72rem' }}>
                              {[vendor.city, vendor.state, vendor.country].filter(Boolean).join(' · ')}
                            </div>
                          </div>
                          <span className="official-vendor-card__ribbon flex-shrink-0" style={{ fontSize: '0.62rem', padding: '0.2rem 0.45rem' }}>
                            {vendor.badge || t('marketplace.officialPartnerBadge')}
                          </span>
                        </div>
                        <p className="small mt-2 mb-2 ta-marketplace-official-strip__note">{vendor.note || '—'}</p>
                        <div className="small text-muted" style={{ fontSize: '0.7rem' }}>
                          {vendor.nationalShipping ? t('marketplace.nationalShipping') : t('marketplace.regionalShipping')}
                          {(vendor.shipsToCountries || []).length > 0 && (
                            <span className="d-block mt-1">{t('marketplace.shipsTo')}: {(vendor.shipsToCountries || []).join(', ')}</span>
                          )}
                        </div>
                      </div>
                      <div className="mt-auto pt-2 w-100">
                        {vendor.websiteUrl ? (
                          <a href={vendor.websiteUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-dark w-100">
                            {t('marketplace.visitSite')}
                          </a>
                        ) : (
                          <span className="btn btn-sm btn-outline-secondary w-100 disabled">{t('marketplace.visitSite')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {officialVendors.length > 1 && (
              <div
                className="d-flex d-md-none justify-content-center align-items-center gap-2 mt-2 pt-1"
                role="group"
                aria-label={t('marketplace.officialStripNavAria')}
              >
                <button
                  type="button"
                  className="ta-marketplace-official-strip__nav-btn"
                  onClick={() => scrollOfficialStrip('prev')}
                  disabled={officialStripEdge.atStart}
                  aria-label={t('discover.prev')}
                >
                  <span aria-hidden className="ta-marketplace-official-strip__nav-icon">‹</span>
                </button>
                <button
                  type="button"
                  className="ta-marketplace-official-strip__nav-btn"
                  onClick={() => scrollOfficialStrip('next')}
                  disabled={officialStripEdge.atEnd}
                  aria-label={t('discover.next')}
                >
                  <span aria-hidden className="ta-marketplace-official-strip__nav-icon">›</span>
                </button>
              </div>
            )}
          </div>
        </section>

        <div className="card border-0 shadow-sm mb-3 ta-premium-pane">
          <div className="card-body p-3">
            <h2 className="h6 fw-bold mb-2" style={{ color: 'var(--ta-parchment)' }}>{t('marketplace.searchCardTitle')}</h2>
            <div className="d-flex gap-2 flex-wrap align-items-center">
              <input
                className="form-control form-control-sm flex-grow-1"
                style={{ minWidth: 140 }}
                placeholder={t('marketplace.searchPlaceholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select className="form-select form-select-sm" style={{ width: 'auto', minWidth: 120 }}
                value={filters.country}
                onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value, state: '', city: '' }))}>
                <option value="">{t('marketplace.anyCountry')}</option>
                {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="form-select form-select-sm" style={{ width: 'auto', minWidth: 120 }}
                value={filters.state}
                onChange={(e) => setFilters((f) => ({ ...f, state: e.target.value, city: '' }))}>
                <option value="">{t('marketplace.anyState')}</option>
                {availableStates.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select className="form-select form-select-sm" style={{ width: 'auto', minWidth: 120 }}
                value={filters.city}
                onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}>
                <option value="">{t('marketplace.anyCity')}</option>
                {filterCities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="form-check d-flex align-items-center mb-0">
                <input className="form-check-input me-1" type="checkbox" id="nearMe"
                  checked={filters.nearMe} onChange={(e) => setFilters((f) => ({ ...f, nearMe: e.target.checked }))} />
                <label className="form-check-label small mb-0" htmlFor="nearMe">
                  {t('marketplace.nearMe')}
                </label>
              </div>
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => Promise.all([loadPublicListings(), loadOfficialVendors()])}>
                {t('common.search')}
              </button>
            </div>
          </div>
        </div>

        {!user && (
          <div className="alert alert-secondary small py-2 px-3 mb-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
            <span className="mb-0">{t('marketplace.loginToSell')}</span>
            <Link to="/login" className="btn btn-sm btn-dark">{t('nav.login', 'Login')}</Link>
          </div>
        )}

        {user && (
          <div className="card border-0 shadow-sm mb-3 ta-premium-pane">
            <div className="card-body py-2 px-3">
              <div className="d-flex flex-wrap align-items-center gap-2 gap-md-3 justify-content-between">
                <div className="d-flex align-items-center gap-2 min-w-0">
                  <img
                    src={imgUrl(myProfile.profilePhoto || user.profilePhoto) || '/spider-default.png'}
                    alt=""
                    style={{ width: 40, height: 40, borderRadius: 999, objectFit: 'cover' }}
                  />
                  <div className="min-w-0 small">
                    <div className="fw-semibold text-truncate">{user.displayName || 'Keeper'}</div>
                    <div className="text-muted text-truncate">
                      {(myProfile.handle || user.publicHandle) ? (
                        <PublicKeeperHandle
                          handle={myProfile.handle || user.publicHandle || ''}
                          displayName={user.displayName || 'Keeper'}
                          profilePhoto={myProfile.profilePhoto || user.profilePhoto || null}
                          className="text-truncate"
                        />
                      ) : null}
                      {myReputation && (
                        <span className="d-none d-sm-inline ms-1">
                          · {t('marketplace.reputationLine', { tier: myReputation.tier, score: myReputation.score })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <Link to="/marketplace/sell" className="btn btn-sm btn-dark">{t('marketplace.manageListingsCta')}</Link>
                  <Link to="/marketplace/messages" className="btn btn-sm btn-outline-secondary">{t('marketplace.messagesInboxCta')}</Link>
                  <Link to="/account" className="btn btn-sm btn-outline-secondary">{t('marketplace.sellerAccountLink')}</Link>
                  {(myProfile.handle || user.publicHandle) && (
                    <Link to={`/u/${encodeURIComponent(myProfile.handle || user.publicHandle)}`} className="btn btn-sm btn-outline-dark d-none d-md-inline-block">
                      {t('marketplace.viewPublicProfile')}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="ta-marketplace-community-intro mb-4 p-3 p-md-4 rounded-3">
          <h2 className="h5 fw-bold mb-2" style={{ color: 'var(--ta-parchment)' }}>Peer listings</h2>
          <p className="small mb-2" style={{ color: 'var(--ta-text)', lineHeight: 1.55 }}>{t('marketplace.communityIntro')}</p>
          <p className="small mb-0" style={{ color: 'var(--ta-text-muted)', lineHeight: 1.55 }}>{t('marketplace.communityDisclaimer')}</p>
        </div>

        <div className="row g-4">
          <div className="col-12">
            <div className="mb-3 pb-2 border-bottom" style={{ borderColor: 'var(--ta-border)' }}>
              <h3 className="h5 fw-bold mb-1" style={{ color: 'var(--ta-parchment)' }}>{t('marketplace.feedCommunityHeader')}</h3>
              <p className="small text-muted mb-0">{t('marketplace.feedCommunitySub')}</p>
            </div>
            <div className="row g-2 g-md-3">
              {loading && <p className="text-muted small">{t('common.loading')}</p>}
              {!loading && visibleListings.length === 0 && (
                <p className="text-muted small">
                  {t('marketplace.feedEmptyPrelaunch')}
                </p>
              )}
              {partnerListings.map((l) => (
                <div className="col-6 col-md-4 col-xl-3" key={l.id}>
                  <div
                    className="card border-warning shadow-sm h-100 ta-premium-pane ta-marketplace-listing-card ta-marketplace-listing-card-clickable"
                    onClick={(ev) => {
                      if (ev.target.closest('a')) return
                      navigate(`/marketplace/listing/${l.id}`)
                    }}
                    role="presentation"
                  >
                    <img
                      src={(imgUrl(l.imageUrl) || l.imageUrl || '/spider-default.png')}
                      alt={l.title}
                      className="card-img-top"
                      style={{ maxHeight: 160, objectFit: 'cover' }}
                    />
                    <div className="card-body">
                      <h6 className="fw-bold d-flex align-items-center gap-2 flex-wrap">
                        <OfficialPartnerShield width={22} height={24} />
                        <span>{l.title}</span>
                        <span className="badge bg-warning text-dark">
                          {l.badgeLabel || t('marketplace.certifiedPartnerBadge')}
                        </span>
                      </h6>
                      <p className="small text-muted mb-2">{l.speciesName || '-'}</p>
                      <p className="small mb-2">{l.description || '-'}</p>
                      <div className="small text-muted mb-2">
                        {[l.city, l.state, l.country].filter(Boolean).join(' · ') || '-'}
                      </div>
                      <div className="fw-semibold mb-2">
                        {l.priceAmount != null ? `${l.priceAmount} ${l.currency || ''}` : t('marketplace.priceOnRequest')}
                      </div>
                      <div className="small text-muted mb-2">
                        {t('marketplace.partnerListingFootnote')}
                      </div>
                      <div className="d-flex gap-2 flex-wrap">
                        {l.canonicalUrl ? (
                          <a href={l.canonicalUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-dark">
                            {t('marketplace.partnerBuyOfficialCta')}
                          </a>
                        ) : (
                          <span className="small text-muted">{t('marketplace.partnerCanonicalMissing')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {peerListings.map((l) => (
                <div className="col-6 col-md-4 col-xl-3" key={l.id}>
                  <div
                    className="card border-0 shadow-sm h-100 ta-premium-pane ta-marketplace-listing-card ta-marketplace-listing-card-clickable position-relative"
                    onClick={(ev) => {
                      if (ev.target.closest('a, button')) return
                      navigate(`/marketplace/listing/${l.id}`)
                    }}
                    role="presentation"
                  >
                    {l.imageUrl ? (
                      <img
                        src={imgUrl(l.imageUrl) || l.imageUrl}
                        alt={l.title}
                        className="card-img-top"
                        style={{ maxHeight: 160, objectFit: 'cover' }}
                      />
                    ) : null}
                    <div className="card-body position-relative">
                      {user && String(user.id) !== String(l.sellerUserId) && (
                        <button
                          type="button"
                          className="btn btn-link ta-marketplace-listing-report"
                          onClick={() => reportListing(l.id)}
                          aria-label={t('marketplace.report')}
                        >
                          {t('marketplace.report')}
                        </button>
                      )}
                      <h6
                        className={`fw-bold d-flex align-items-center gap-2 flex-wrap ${
                          user && String(user.id) !== String(l.sellerUserId) ? 'pe-5' : ''
                        }`}
                      >
                        <span>{l.title}</span>
                        {l.boosted && (
                          <span className="badge bg-warning text-dark">{t('marketplace.boostedBadge')}</span>
                        )}
                      </h6>
                      <p className="small text-muted mb-2">{l.speciesName || '-'}</p>
                      <p className="small mb-2">{l.description || '-'}</p>
                      <div className="small text-muted mb-2">
                        {[l.city, l.state, l.country].filter(Boolean).join(' · ') || '-'}
                      </div>
                      <div className="fw-semibold mb-2">
                        {l.priceAmount != null ? `${l.priceAmount} ${l.currency || ''}` : t('marketplace.priceOnRequest')}
                      </div>
                      {l.sellerHandle && (
                        <div className="small mb-2">
                          <PublicKeeperHandle
                            handle={l.sellerHandle}
                            displayName={l.sellerDisplayName || 'keeper'}
                            profilePhoto={l.sellerProfilePhoto || null}
                            linkClassName="text-decoration-none fw-semibold ta-marketplace-keeper-link"
                          />
                        </div>
                      )}
                      <div className="d-flex gap-2 flex-wrap align-items-center">
                        <Link
                          to={l.sellerHandle ? `/u/${encodeURIComponent(l.sellerHandle)}` : `/marketplace/keeper/${l.sellerUserId}`}
                          className="btn btn-sm ta-marketplace-view-profile-btn"
                        >
                          {t('marketplace.viewSeller')}
                        </Link>
                        {String(user?.id || '') !== String(l.sellerUserId) && (
                          user ? (
                            <Link
                              to={`/marketplace/messages?openSeller=${encodeURIComponent(l.sellerUserId)}&openListing=${encodeURIComponent(l.id)}`}
                              className="btn btn-sm btn-dark"
                            >
                              {t('marketplace.messageSeller')}
                            </Link>
                          ) : (
                            <Link
                              to="/login"
                              state={{
                                redirectAfterAuth:
                                  `/marketplace/messages?openSeller=${encodeURIComponent(l.sellerUserId)}&openListing=${encodeURIComponent(l.id)}`,
                              }}
                              className="btn btn-sm btn-dark"
                            >
                              {t('marketplace.messageSeller')}
                            </Link>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <details className="card border-0 shadow-sm mt-2 ta-marketplace-official-apply-details marketplace-official-apply-panel ta-premium-pane p-0 overflow-hidden">
          <summary className="px-3 py-3 small" style={{ cursor: 'pointer', listStyle: 'none' }}>
            <span className="fw-semibold" style={{ color: 'var(--ta-gold-classic)' }}>{t('marketplace.officialApplyToggle')}</span>
            <span className="d-block mt-1 text-muted" style={{ fontSize: '0.75rem' }}>{t('marketplace.officialApplyBlurb')}</span>
          </summary>
          <div className="px-3 pb-3 pt-0 border-top" style={{ borderColor: 'var(--ta-border)' }}>
            <h6 className="marketplace-official-apply-panel__title mb-2 small mt-3">{t('marketplace.officialApplyTitle')}</h6>
            <form className="small" onSubmit={submitOfficialLead}>
              <div className="row g-2">
                <div className="col-md-6">
                  <input
                    className="form-control form-control-sm"
                    required
                    placeholder={t('marketplace.officialBusinessName')}
                    value={vendorLeadForm.businessName}
                    onChange={(e) => setVendorLeadForm((f) => ({ ...f, businessName: e.target.value }))}
                  />
                </div>
                <div className="col-md-6">
                  <input
                    className="form-control form-control-sm"
                    required
                    type="email"
                    placeholder={t('marketplace.officialEmail')}
                    value={vendorLeadForm.contactEmail}
                    onChange={(e) => setVendorLeadForm((f) => ({ ...f, contactEmail: e.target.value }))}
                  />
                </div>
                <div className="col-md-6">
                  <input
                    className="form-control form-control-sm"
                    placeholder={t('marketplace.officialContactName')}
                    value={vendorLeadForm.contactName}
                    onChange={(e) => setVendorLeadForm((f) => ({ ...f, contactName: e.target.value }))}
                  />
                </div>
                <div className="col-md-6">
                  <input
                    className="form-control form-control-sm"
                    placeholder={t('marketplace.officialWebsite')}
                    value={vendorLeadForm.websiteUrl}
                    onChange={(e) => setVendorLeadForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                  />
                </div>
                <div className="col-md-4">
                  <select className="form-select form-select-sm" value={vendorLeadForm.country}
                    onChange={(e) => setVendorLeadForm((f) => ({ ...f, country: e.target.value, state: '', city: '' }))}>
                    {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-md-4">
                  <select className="form-select form-select-sm" value={vendorLeadForm.state}
                    onChange={(e) => setVendorLeadForm((f) => ({ ...f, state: e.target.value, city: '' }))}>
                    <option value="">{t('marketplace.fieldState')}</option>
                    {(STATES_BY_COUNTRY[vendorLeadForm.country] || []).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-md-4">
                  <select className="form-select form-select-sm" value={vendorLeadForm.city}
                    onChange={(e) => setVendorLeadForm((f) => ({ ...f, city: e.target.value }))}>
                    <option value="">{t('marketplace.fieldCity')}</option>
                    {(CITIES_BY_STATE[vendorLeadForm.state] || []).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-md-4">
                  <select className="form-select form-select-sm" value={vendorLeadForm.shippingScope}
                    onChange={(e) => setVendorLeadForm((f) => ({ ...f, shippingScope: e.target.value }))}>
                    <option value="national">{t('marketplace.nationalShipping')}</option>
                    <option value="regional">{t('marketplace.regionalShipping')}</option>
                    <option value="local">{t('marketplace.shippingLocal')}</option>
                  </select>
                </div>
                <div className="col-md-8">
                  <input
                    className="form-control form-control-sm"
                    placeholder={t('marketplace.officialNote')}
                    value={vendorLeadForm.note}
                    onChange={(e) => setVendorLeadForm((f) => ({ ...f, note: e.target.value }))}
                  />
                </div>
                <div className="col-12 d-flex justify-content-end">
                  <button className="btn btn-sm btn-dark" disabled={savingVendorLead}>
                    {savingVendorLead ? t('common.saving') : t('marketplace.officialApplyCta')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </details>
      </div>
    </div>
  )
}
