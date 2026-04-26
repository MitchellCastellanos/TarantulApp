import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import marketplaceService from '../services/marketplaceService'
import moderationService from '../services/moderationService'
import chatService from '../services/chatService'
import { COUNTRY_OPTIONS, STATES_BY_COUNTRY, CITIES_BY_STATE } from '../constants/locations'
import { imgUrl } from '../services/api'
import BrandLogoMark from '../components/BrandLogoMark'
import OfficialPartnerShield from '../components/OfficialPartnerShield'
import PublicKeeperHandle from '../components/PublicKeeperHandle'
import { usePageSeo } from '../hooks/usePageSeo'

const EMPTY_LISTING_FORM = {
  title: '',
  description: '',
  speciesName: '',
  stage: 'sling',
  sex: 'unsexed',
  priceAmount: '',
  currency: 'MXN',
  state: '',
  city: '',
  country: 'Mexico',
  imageUrl: '',
  pedigreeRef: '',
  requestBoost: false,
}

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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MIN_CHAT_MESSAGES_FOR_REVIEW = 6

export default function MarketplacePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [listings, setListings] = useState([])
  const [officialVendors, setOfficialVendors] = useState([])
  const [myListings, setMyListings] = useState([])
  const [myProfile, setMyProfile] = useState(EMPTY_PROFILE_FORM)
  const [listingForm, setListingForm] = useState(EMPTY_LISTING_FORM)
  const [vendorLeadForm, setVendorLeadForm] = useState(EMPTY_VENDOR_LEAD_FORM)
  const [loading, setLoading] = useState(false)
  const [savingListing, setSavingListing] = useState(false)
  const [uploadingListingImage, setUploadingListingImage] = useState(false)
  const [savingVendorLead, setSavingVendorLead] = useState(false)
  const [message, setMessage] = useState('')
  const [myReputation, setMyReputation] = useState(null)
  const [myBadgesProgress, setMyBadgesProgress] = useState(null)
  const [listingBoostAvailable, setListingBoostAvailable] = useState(false)
  const [threads, setThreads] = useState({ content: [] })
  const [activeThread, setActiveThread] = useState(null)
  const [threadMessages, setThreadMessages] = useState({ content: [] })
  const [chatBody, setChatBody] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [sendingReview, setSendingReview] = useState(false)
  const [filters, setFilters] = useState({ country: '', state: '', city: '', nearMe: true })
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
    const [mine, profile] = await Promise.all([
      marketplaceService.listMine(),
      marketplaceService.getMyProfile(),
    ])
    setMyListings(Array.isArray(mine) ? mine : [])
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
    })
    setMyReputation(profile?.reputation || null)
    setMyBadgesProgress(profile?.badgesProgress || null)
  }

  const loadThreads = useCallback(async () => {
    if (!user?.id) return
    const data = await chatService.threads(0, 30)
    const onlyMarketplace = {
      ...(data || {}),
      content: (data?.content || []).filter((th) => !!th.listingId),
    }
    setThreads(onlyMarketplace)
  }, [user?.id])
  const onListingImageFile = useCallback(
    async (e) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      setUploadingListingImage(true)
      setMessage('')
      try {
        const data = await marketplaceService.uploadListingImage(file)
        const u = data?.imageUrl
        if (u) setListingForm((f) => ({ ...f, imageUrl: u }))
        else setMessage(t('marketplace.error'))
      } catch (err) {
        setMessage(err?.response?.data?.message || err?.response?.data?.error || t('marketplace.error'))
      } finally {
        setUploadingListingImage(false)
      }
    },
    [t]
  )


  useEffect(() => {
    setLoading(true)
    Promise.all([loadPublicListings(), loadOfficialVendors(), loadMine().catch(() => {}), loadThreads().catch(() => {})])
      .finally(() => setLoading(false))
  }, [loadThreads])

  useEffect(() => {
    marketplaceService
      .getListingBoostOffer()
      .then((d) => setListingBoostAvailable(!!d?.available))
      .catch(() => setListingBoostAvailable(false))
  }, [])

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

  useEffect(() => {
    const openSeller = searchParams.get('openSeller')
    const openListing = searchParams.get('openListing')
    if (!user?.id || !openSeller?.trim()) return
    const sellerId = openSeller.trim()
    if (String(sellerId) === String(user.id)) return
    let cancelled = false
    ;(async () => {
      try {
        const listingId = openListing && UUID_REGEX.test(String(openListing).trim())
          ? String(openListing).trim()
          : null
        const row = await chatService.openThread(sellerId, listingId)
        if (cancelled) return
        setActiveThread(row)
        const msgs = await chatService.messages(row.id, 0, 50)
        if (!cancelled) setThreadMessages(msgs)
        await loadThreads()
      } catch (err) {
        if (!cancelled) setMessage(err?.response?.data?.error || t('marketplace.error'))
      } finally {
        const next = new URLSearchParams(searchParams)
        next.delete('openSeller')
        next.delete('openListing')
        setSearchParams(next, { replace: true })
      }
    })()
    return () => { cancelled = true }
  }, [searchParams, setSearchParams, loadThreads, user?.id, t])

  useEffect(() => {
    Promise.all([loadPublicListings(), loadOfficialVendors()]).catch(() => {})
  }, [filters, query, myProfile.country, myProfile.state, myProfile.city])

  const visibleListings = useMemo(() => listings.filter((l) => l.status !== 'hidden'), [listings])
  const partnerListings = useMemo(
    () => visibleListings.filter((l) => l.source === 'partner' || l.isPartner),
    [visibleListings]
  )
  const peerListings = useMemo(
    () => visibleListings.filter((l) => l.source !== 'partner' && !l.isPartner),
    [visibleListings]
  )

  const submitListing = async (e) => {
    e.preventDefault()
    setSavingListing(true)
    setMessage('')
    try {
      const { requestBoost, ...rest } = listingForm
      const data = await marketplaceService.createListing({
        ...rest,
        priceAmount: listingForm.priceAmount ? Number(listingForm.priceAmount) : null,
        requestListingBoost: !!requestBoost,
      })
      if (data?.boostCheckoutUrl) {
        window.location.assign(data.boostCheckoutUrl)
        return
      }
      setListingForm(EMPTY_LISTING_FORM)
      await Promise.all([loadPublicListings(), loadMine()])
      setMessage(t('marketplace.createdOk'))
    } catch (err) {
      setMessage(err?.response?.data?.error || t('marketplace.error'))
    } finally {
      setSavingListing(false)
    }
  }

  const markSold = async (listingId) => {
    await marketplaceService.updateListingStatus(listingId, 'sold')
    await Promise.all([loadPublicListings(), loadMine()])
  }

  const pickThread = async (thread) => {
    setActiveThread(thread)
    try {
      const msgs = await chatService.messages(thread.id, 0, 50)
      setThreadMessages(msgs)
    } catch {
      setMessage(t('marketplace.error'))
    }
  }

  const sendMarketplaceMessage = async (e) => {
    e.preventDefault()
    if (!activeThread?.id) return
    const text = (chatBody || '').trim()
    if (!text) return
    try {
      await chatService.sendMessage(activeThread.id, text)
      setChatBody('')
      const msgs = await chatService.messages(activeThread.id, 0, 50)
      setThreadMessages(msgs)
      await loadThreads()
    } catch (err) {
      setMessage(err?.response?.data?.error || t('marketplace.error'))
    }
  }

  const sendMarketplaceReview = async (e) => {
    e.preventDefault()
    if (!activeThread?.listingId || !activeThread?.listingSellerUserId) return
    setSendingReview(true)
    setMessage('')
    try {
      await marketplaceService.addReview(activeThread.listingSellerUserId, {
        listingId: activeThread.listingId,
        rating: Number(reviewRating),
        comment: reviewComment,
      })
      setReviewComment('')
      setMessage(t('marketplace.reviewSaved'))
    } catch (err) {
      setMessage(err?.response?.data?.error || t('marketplace.error'))
    } finally {
      setSendingReview(false)
    }
  }

  const reportListing = async (listingId) => {
    const reason = window.prompt(t('marketplace.reportReason'))
    if (!reason || !reason.trim()) return
    await moderationService.reportMarketplaceListing(listingId, { reason: reason.trim(), details: '' })
    setMessage(t('marketplace.reportSent'))
  }

  const reportMarketplaceChat = async (threadId) => {
    const reason = window.prompt(t('marketplace.reportReason'))
    if (!reason || !reason.trim()) return
    await moderationService.reportMarketplaceChat(threadId, { reason: reason.trim(), details: '' })
    setMessage(t('marketplace.reportSent'))
  }

  const reportMarketplaceSeller = async (sellerUserId) => {
    const reason = window.prompt(t('marketplace.reportReason'))
    if (!reason || !reason.trim()) return
    await moderationService.reportKeeperProfile(sellerUserId, { reason: reason.trim(), details: '' })
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
  const listingStates = STATES_BY_COUNTRY[listingForm.country || 'Mexico'] || []
  const listingCities = CITIES_BY_STATE[listingForm.state] || []
  const filterCities = CITIES_BY_STATE[filters.state] || []
  const activeThreadMessages = Array.isArray(threadMessages.content) ? threadMessages.content : []
  const sentByCurrentUser = activeThreadMessages.filter((m) => String(m.senderUserId) === String(user?.id)).length
  const sentByOtherUser = activeThreadMessages.filter((m) => String(m.senderUserId) !== String(user?.id)).length
  const canReviewFromChat = !!activeThread
    && !!activeThread.listingId
    && !!activeThread.listingSellerUserId
    && String(activeThread.listingSellerUserId) !== String(user?.id)
    && String(activeThread.listingSellerUserId) === String(activeThread.otherUserId)
    && activeThreadMessages.length >= MIN_CHAT_MESSAGES_FOR_REVIEW
    && sentByCurrentUser >= 2
    && sentByOtherUser >= 2

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
                <div className="small text-uppercase fw-bold mb-1" style={{ letterSpacing: '0.1em', color: 'var(--ta-gold)' }}>
                  {t('marketplace.officialStripLabel')}
                </div>
                <p className="small mb-0" style={{ color: 'var(--ta-text-muted)', lineHeight: 1.45 }}>{t('marketplace.officialStripSub')}</p>
              </div>
            </div>
            <span className="ta-marketplace-official-strip__badge flex-shrink-0">{t('marketplace.officialBadge')}</span>
          </div>
          <div className="ta-marketplace-official-strip__scroll">
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
        </section>

        <div className="row g-3 mb-4">
          <div className="col-lg-4">
            {user ? (
              <div className="card border-0 shadow-sm h-100 ta-premium-pane">
                <div className="card-body p-3">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <img src={imgUrl(myProfile.profilePhoto) || '/spider-default.png'} alt="keeper" style={{ width: 46, height: 46, borderRadius: 999, objectFit: 'cover' }} />
                    <div className="min-w-0">
                      <div className="fw-semibold text-truncate">{user.displayName || 'Keeper'}</div>
                      <div className="small text-muted text-truncate">
                        <PublicKeeperHandle
                          handle={myProfile.handle || user.publicHandle || ''}
                          displayName={user.displayName || 'Keeper'}
                          profilePhoto={myProfile.profilePhoto || null}
                          className="text-truncate"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="small text-muted">
                    {[myProfile.city, myProfile.state, myProfile.country].filter(Boolean).join(' · ') || 'Ubicacion no definida'}
                  </div>
                  {myReputation && (
                    <div className="small mt-2">
                      <span className="fw-semibold">{t('marketplace.reputationTitle')}:</span>{' '}
                      {t('marketplace.reputationLine', { tier: myReputation.tier, score: myReputation.score })}
                    </div>
                  )}
                  <div className="d-flex gap-2 flex-wrap mt-3">
                    <Link to="/account" className="btn btn-sm btn-outline-secondary">Editar en Cuenta</Link>
                    {!!(myProfile.handle || user.publicHandle) && (
                      <Link to={`/u/${encodeURIComponent(myProfile.handle || user.publicHandle)}`} className="btn btn-sm btn-outline-dark">
                        Ver perfil publico
                      </Link>
                    )}
                  </div>
                  <p className="small text-muted mb-0 mt-2">
                    Tu perfil de keeper aparece aqui en compacto para no saturar la barra derecha.
                  </p>
                </div>
              </div>
            ) : (
              <div className="card border-0 shadow-sm h-100 ta-premium-pane">
                <div className="card-body p-3 small">
                  <div className="fw-semibold mb-1">Perfil de keeper</div>
                  <p className="text-muted mb-2">Inicia sesion para activar tu perfil publico y publicar listings.</p>
                  <Link to="/login" className="btn btn-sm btn-dark">Entrar</Link>
                </div>
              </div>
            )}
          </div>
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm h-100 ta-premium-pane">
              <div className="card-body p-3">
                <h2 className="h6 fw-bold mb-2" style={{ color: 'var(--ta-parchment)' }}>Buscar listings</h2>
                <div className="d-flex gap-2 flex-wrap">
                  <input
                    className="form-control form-control-sm"
                    placeholder={t('marketplace.searchPlaceholder')}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <select className="form-select form-select-sm" value={filters.country}
                    onChange={(e) => setFilters((f) => ({ ...f, country: e.target.value, state: '', city: '' }))}>
                    <option value="">{t('marketplace.anyCountry')}</option>
                    {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select className="form-select form-select-sm" value={filters.state}
                    onChange={(e) => setFilters((f) => ({ ...f, state: e.target.value, city: '' }))}>
                    <option value="">{t('marketplace.anyState')}</option>
                    {availableStates.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select className="form-select form-select-sm" value={filters.city}
                    onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}>
                    <option value="">{t('marketplace.anyCity')}</option>
                    {filterCities.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="form-check d-flex align-items-center ms-1">
                    <input className="form-check-input me-1" type="checkbox" id="nearMe"
                      checked={filters.nearMe} onChange={(e) => setFilters((f) => ({ ...f, nearMe: e.target.checked }))} />
                    <label className="form-check-label small" htmlFor="nearMe">
                      {t('marketplace.nearMe')}
                    </label>
                  </div>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => Promise.all([loadPublicListings(), loadOfficialVendors()])}>
                    {t('common.search')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ta-marketplace-community-intro mb-4 p-3 p-md-4 rounded-3">
          <h2 className="h5 fw-bold mb-2" style={{ color: 'var(--ta-parchment)' }}>Peer listings</h2>
          <p className="small mb-2" style={{ color: 'var(--ta-text)', lineHeight: 1.55 }}>{t('marketplace.communityIntro')}</p>
          <p className="small mb-0" style={{ color: 'var(--ta-text-muted)', lineHeight: 1.55 }}>{t('marketplace.communityDisclaimer')}</p>
        </div>

        <div className="row g-4">
          <div className="col-lg-8">
            <div className="mb-3 pb-2 border-bottom" style={{ borderColor: 'var(--ta-border)' }}>
              <h3 className="h5 fw-bold mb-1" style={{ color: 'var(--ta-parchment)' }}>{t('marketplace.feedCommunityHeader')}</h3>
              <p className="small text-muted mb-0">{t('marketplace.feedCommunitySub')}</p>
            </div>
            <div className="row g-3">
              {loading && <p className="text-muted small">{t('common.loading')}</p>}
              {!loading && visibleListings.length === 0 && (
                <p className="text-muted small">
                  {t('marketplace.feedEmptyPrelaunch')}
                </p>
              )}
              {partnerListings.map((l) => (
                <div className="col-md-6" key={l.id}>
                  <div className="card border-warning shadow-sm h-100 ta-premium-pane">
                    <img
                      src={(imgUrl(l.imageUrl) || l.imageUrl || '/spider-default.png')}
                      alt={l.title}
                      className="card-img-top"
                      style={{ maxHeight: 200, objectFit: 'cover' }}
                    />
                    <div className="card-body">
                      <h6 className="fw-bold d-flex align-items-center gap-2 flex-wrap">
                        <OfficialPartnerShield width={22} height={24} />
                        <span>{l.title}</span>
                        <span className="badge bg-warning text-dark">{l.badgeLabel || t('marketplace.officialPartnerBadge')}</span>
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
                        {t('marketplace.partnerSourceNote')}
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
                <div className="col-md-6" key={l.id}>
                  <div className="card border-0 shadow-sm h-100 ta-premium-pane">
                    {l.imageUrl ? (
                      <img
                        src={imgUrl(l.imageUrl) || l.imageUrl}
                        alt={l.title}
                        className="card-img-top"
                        style={{ maxHeight: 200, objectFit: 'cover' }}
                      />
                    ) : null}
                    <div className="card-body">
                      <h6 className="fw-bold d-flex align-items-center gap-2 flex-wrap">
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
                          />
                        </div>
                      )}
                      <div className="d-flex gap-2 flex-wrap">
                        <Link to={l.sellerHandle ? `/u/${encodeURIComponent(l.sellerHandle)}` : `/marketplace/keeper/${l.sellerUserId}`} className="btn btn-sm btn-outline-dark">
                          {t('marketplace.viewSeller')}
                        </Link>
                        {String(user?.id || '') !== String(l.sellerUserId) && (
                          user ? (
                            <Link
                              to={`/marketplace?openSeller=${encodeURIComponent(l.sellerUserId)}&openListing=${encodeURIComponent(l.id)}`}
                              className="btn btn-sm btn-dark"
                            >
                              {t('marketplace.messageSeller')}
                            </Link>
                          ) : (
                            <Link
                              to="/login"
                              state={{
                                redirectAfterAuth:
                                  `/marketplace?openSeller=${encodeURIComponent(l.sellerUserId)}&openListing=${encodeURIComponent(l.id)}`,
                              }}
                              className="btn btn-sm btn-dark"
                            >
                              {t('marketplace.messageSeller')}
                            </Link>
                          )
                        )}
                        {user && String(user.id) !== String(l.sellerUserId) && (
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => reportListing(l.id)}>
                            {t('marketplace.report')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-lg-4">
            {!user ? (
              <div className="card border-0 shadow-sm ta-premium-pane">
                <div className="card-body small">
                  <p className="mb-2">{t('marketplace.loginToSell')}</p>
                  <Link to="/login" className="btn btn-sm btn-dark">{t('nav.login', 'Login')}</Link>
                </div>
              </div>
            ) : (
              <>
                <div className="card border-0 shadow-sm mb-3 ta-premium-pane">
                  <div className="card-body">
                    <h6>{t('marketplace.publishTitle')}</h6>
                    <form onSubmit={submitListing} className="small">
                      <input className="form-control form-control-sm mb-2" placeholder={t('marketplace.fieldTitle')}
                        required value={listingForm.title} onChange={(e) => setListingForm((f) => ({ ...f, title: e.target.value }))} />
                      <input className="form-control form-control-sm mb-2" placeholder={t('marketplace.fieldSpecies')}
                        value={listingForm.speciesName} onChange={(e) => setListingForm((f) => ({ ...f, speciesName: e.target.value }))} />
                      <textarea className="form-control form-control-sm mb-2" rows={2} placeholder={t('marketplace.fieldDescription')}
                        value={listingForm.description} onChange={(e) => setListingForm((f) => ({ ...f, description: e.target.value }))} />
                      <div className="row g-2 mb-2">
                        <div className="col-6">
                          <input className="form-control form-control-sm" type="number" min="0" step="0.01"
                            placeholder={t('marketplace.fieldPrice')}
                            value={listingForm.priceAmount} onChange={(e) => setListingForm((f) => ({ ...f, priceAmount: e.target.value }))} />
                        </div>
                        <div className="col-6">
                          <input className="form-control form-control-sm"
                            placeholder={t('marketplace.fieldCurrency')}
                            value={listingForm.currency} onChange={(e) => setListingForm((f) => ({ ...f, currency: e.target.value }))} />
                        </div>
                      </div>
                      <select className="form-select form-select-sm mb-2"
                        value={listingForm.country} onChange={(e) => setListingForm((f) => ({ ...f, country: e.target.value, state: '', city: '' }))}>
                        {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select className="form-select form-select-sm mb-2"
                        value={listingForm.state} onChange={(e) => setListingForm((f) => ({ ...f, state: e.target.value, city: '' }))}>
                        <option value="">{t('marketplace.fieldState')}</option>
                        {listingStates.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select className="form-select form-select-sm mb-2"
                        value={listingForm.city} onChange={(e) => setListingForm((f) => ({ ...f, city: e.target.value }))}>
                        <option value="">{t('marketplace.fieldCity')}</option>
                        {listingCities.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <label className="form-label small mb-1" style={{ color: 'var(--ta-text-muted)' }}>{t('marketplace.fieldImageUpload')}</label>
                      <input
                        type="file"
                        className="form-control form-control-sm mb-2"
                        accept="image/*"
                        disabled={uploadingListingImage}
                        onChange={onListingImageFile}
                      />
                      <input
                        className="form-control form-control-sm mb-2"
                        placeholder={t('marketplace.fieldImage')}
                        value={listingForm.imageUrl}
                        onChange={(e) => setListingForm((f) => ({ ...f, imageUrl: e.target.value }))}
                      />
                      {uploadingListingImage && <p className="small text-muted mb-1">{t('marketplace.uploadingImage')}</p>}
                      {listingBoostAvailable && (
                        <div className="form-check mb-2 p-2 rounded" style={{ background: 'rgba(0,0,0,0.08)' }}>
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="listing-request-boost"
                            checked={!!listingForm.requestBoost}
                            onChange={(e) => setListingForm((f) => ({ ...f, requestBoost: e.target.checked }))}
                          />
                          <label className="form-check-label" htmlFor="listing-request-boost" style={{ cursor: 'pointer' }}>
                            {t('marketplace.listingBoostLabel')}
                            <span className="d-block small text-muted mt-1">{t('marketplace.listingBoostHint')}</span>
                          </label>
                        </div>
                      )}
                      <button className="btn btn-sm btn-dark w-100" disabled={savingListing}>
                        {savingListing ? t('common.saving') : t('marketplace.publishBtn')}
                      </button>
                    </form>
                  </div>
                </div>

                <div className="card border-0 shadow-sm ta-premium-pane">
                  <div className="card-body small">
                    <h6>Mensajería de marketplace</h6>
                    <p className="text-muted mb-2">Spood ahora se usa para likes en comunidad. Aquí quedan los mensajes de compra/venta.</p>
                    {(threads.content || []).length === 0 ? (
                      <p className="text-muted mb-2">Aún no hay conversaciones.</p>
                    ) : (
                      <div className="mb-2" style={{ maxHeight: 190, overflowY: 'auto' }}>
                        {(threads.content || []).map((th) => (
                          <button
                            key={th.id}
                            type="button"
                            className={`btn btn-sm w-100 text-start mb-1 ${activeThread?.id === th.id ? 'btn-dark' : 'btn-outline-secondary'}`}
                            onClick={() => pickThread(th)}
                          >
                            <div className="fw-semibold">{th.otherDisplayName || th.otherHandle || 'Keeper'}</div>
                            <div className="small text-truncate">{th.lastMessagePreview || '—'}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    {activeThread ? (
                      <>
                        <div className="border rounded p-2 mb-2" style={{ maxHeight: 160, overflowY: 'auto', background: 'rgba(0,0,0,0.08)' }}>
                          {(threadMessages.content || []).map((m) => (
                            <div key={m.id} className="small mb-1">
                              {m.body}
                            </div>
                          ))}
                        </div>
                        <form className="input-group input-group-sm" onSubmit={sendMarketplaceMessage}>
                          <input
                            className="form-control"
                            value={chatBody}
                            onChange={(e) => setChatBody(e.target.value)}
                            placeholder="Escribe un mensaje..."
                          />
                          <button className="btn btn-dark" type="submit">Enviar</button>
                        </form>
                        <div className="d-flex gap-2 flex-wrap mt-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => reportMarketplaceChat(activeThread.id)}
                          >
                            {t('marketplace.reportChat')}
                          </button>
                          {activeThread.listingSellerUserId && String(activeThread.listingSellerUserId) !== String(user?.id) && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => reportMarketplaceSeller(activeThread.listingSellerUserId)}
                            >
                              {t('marketplace.reportSeller')}
                            </button>
                          )}
                        </div>
                        {canReviewFromChat ? (
                          <form className="mt-3" onSubmit={sendMarketplaceReview}>
                            <h6 className="mb-2">{t('marketplace.leaveReviewInChat')}</h6>
                            <select className="form-select form-select-sm mb-2" value={reviewRating} onChange={(e) => setReviewRating(e.target.value)}>
                              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                            <textarea
                              className="form-control form-control-sm mb-2"
                              rows={2}
                              value={reviewComment}
                              onChange={(e) => setReviewComment(e.target.value)}
                              placeholder={t('marketplace.reviewComment')}
                            />
                            <button className="btn btn-sm btn-dark" disabled={sendingReview}>
                              {sendingReview ? t('common.saving') : t('marketplace.sendReview')}
                            </button>
                          </form>
                        ) : (
                          <p className="small text-muted mt-2 mb-0">
                            {t('marketplace.reviewGateHint', { min: MIN_CHAT_MESSAGES_FOR_REVIEW })}
                          </p>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="card border-0 shadow-sm mt-3 ta-premium-pane">
                  <div className="card-body small">
                    <h6>{t('marketplace.myListings')}</h6>
                    {myListings.length === 0 && <p className="text-muted mb-0">{t('marketplace.noneMine')}</p>}
                    {myListings.map((l) => (
                      <div key={l.id} className="border rounded p-2 mb-2">
                        <div className="fw-semibold">{l.title}</div>
                        <div className="text-muted">{l.status}</div>
                        {l.status === 'active' && (
                          <button className="btn btn-sm btn-outline-secondary mt-1" onClick={() => markSold(l.id)}>
                            {t('marketplace.markSold')}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <details className="card border-0 shadow-sm mt-2 ta-marketplace-official-apply-details marketplace-official-apply-panel ta-premium-pane p-0 overflow-hidden">
          <summary className="px-3 py-3 small" style={{ cursor: 'pointer', listStyle: 'none' }}>
            <span className="fw-semibold" style={{ color: 'var(--ta-gold)' }}>{t('marketplace.officialApplyToggle')}</span>
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
