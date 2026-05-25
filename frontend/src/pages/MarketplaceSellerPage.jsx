import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import marketplaceService from '../services/marketplaceService'
import { keeperProfileKeys } from '../query/keeperProfileKeys.js'
import { COUNTRY_OPTIONS, STATES_BY_COUNTRY, CITIES_BY_STATE, SHIPS_TO_OPTIONS } from '../constants/locations'
import { imgUrl } from '../services/api'
import PublicKeeperHandle from '../components/PublicKeeperHandle'
import VendorVerificationCard from '../components/VendorVerificationCard'
import { usePageSeo } from '../hooks/usePageSeo'

const COMMUNITY_LISTING_CATEGORIES = ['tarantulas', 'breeding_projects']

const EMPTY_LISTING_FORM = {
  title: '',
  description: '',
  speciesName: '',
  listingCategory: 'tarantulas',
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
  sellerCertifiesLegalTradeCompliance: false,
  wildCaught: false,
  captureOriginCountryIso: '',
  regulatoryPermitRefs: '',
}

const FILTERS = ['all', 'active', 'sold', 'hidden']

export default function MarketplaceSellerPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [myListings, setMyListings] = useState([])
  const [myProfile, setMyProfile] = useState({
    handle: '',
    profilePhoto: '',
    country: 'Mexico',
    state: '',
    city: '',
    storefrontName: '',
    storefrontTagline: '',
    storefrontShippingPolicy: '',
    storefrontLagPolicy: '',
    contactWhatsapp: '',
    contactInstagram: '',
    shipsTo: [],
  })
  const [sellerProgram, setSellerProgram] = useState({
    tier: 'community',
    activeListingLimit: 5,
    canRequestBoost: false,
    reviewedVendor: false,
    proPlan: false,
    tradeCertificationRequired: false,
    allowedListingCategories: COMMUNITY_LISTING_CATEGORIES,
    vendorBoostCreditsAvailable: 0,
  })
  const [listingForm, setListingForm] = useState(EMPTY_LISTING_FORM)
  const [listingBoostAvailable, setListingBoostAvailable] = useState(false)
  const [savingListing, setSavingListing] = useState(false)
  const [uploadingListingImage, setUploadingListingImage] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [message, setMessage] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  usePageSeo({
    title: t('marketplace.sellerHubTitle'),
    description: t('marketplace.sellerHubSubtitle'),
    imageUrl: origin ? `${origin}/icon-512.png` : undefined,
    canonicalHref: origin ? `${origin}/marketplace/sell` : undefined,
    noindex: true,
  })

  const loadAnalytics = useCallback(async () => {
    if (!user) return
    setAnalyticsLoading(true)
    try {
      const data = await marketplaceService.getSellerAnalytics()
      setAnalytics(data && typeof data === 'object' ? data : null)
    } catch {
      setAnalytics(null)
    } finally {
      setAnalyticsLoading(false)
    }
  }, [user])

  const loadMine = useCallback(async () => {
    if (!user) return
    const [mine, profile] = await Promise.all([
      marketplaceService.listMine(),
      marketplaceService.getMyProfile(),
    ])
    setMyListings(Array.isArray(mine) ? mine : [])
    setMyProfile({
      handle: profile?.handle || '',
      profilePhoto: profile?.profilePhoto || user?.profilePhoto || '',
      country: profile?.country || user?.profileCountry || 'Mexico',
      state: profile?.state || user?.profileState || '',
      city: profile?.city || user?.profileCity || '',
      storefrontName: profile?.storefrontName || '',
      storefrontTagline: profile?.storefrontTagline || '',
      storefrontShippingPolicy: profile?.storefrontShippingPolicy || '',
      storefrontLagPolicy: profile?.storefrontLagPolicy || '',
      contactWhatsapp: profile?.contactWhatsapp || '',
      contactInstagram: profile?.contactInstagram || '',
      shipsTo: Array.isArray(profile?.shipsTo) ? profile.shipsTo : [],
    })
    setSellerProgram({
      tier: profile?.sellerProgram?.tier || 'community',
      activeListingLimit: Number(profile?.sellerProgram?.activeListingLimit || 5),
      canRequestBoost: !!profile?.sellerProgram?.canRequestBoost,
      reviewedVendor: !!profile?.sellerProgram?.reviewedVendor,
      proPlan: !!profile?.sellerProgram?.proPlan,
      tradeCertificationRequired: !!profile?.sellerProgram?.tradeCertificationRequired,
      allowedListingCategories: Array.isArray(profile?.sellerProgram?.allowedListingCategories)
        ? profile.sellerProgram.allowedListingCategories
        : COMMUNITY_LISTING_CATEGORIES,
      vendorBoostCreditsAvailable: Number(profile?.sellerProgram?.vendorBoostCreditsAvailable || 0),
    })
  }, [user])

  useEffect(() => {
    loadMine().catch(() => {})
    loadAnalytics().catch(() => {})
  }, [loadMine, loadAnalytics])

  useEffect(() => {
    marketplaceService
      .getListingBoostOffer()
      .then((d) => setListingBoostAvailable(!!d?.available))
      .catch(() => setListingBoostAvailable(false))
  }, [])

  const vendorBoostCredits = Number(sellerProgram.vendorBoostCreditsAvailable || 0)
  const boostCheckoutAvailable = listingBoostAvailable
  const boostOfferAvailable = boostCheckoutAvailable || vendorBoostCredits > 0

  const listingStates = STATES_BY_COUNTRY[listingForm.country || 'Mexico'] || []
  const listingCities = CITIES_BY_STATE[listingForm.state] || []

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

  const submitListing = async (e) => {
    e.preventDefault()
    setSavingListing(true)
    setMessage('')
    try {
      if (sellerProgram.tradeCertificationRequired && !listingForm.sellerCertifiesLegalTradeCompliance) {
        setMessage(t('marketplace.certificationRequired'))
        setSavingListing(false)
        return
      }
      if (listingForm.wildCaught && String(listingForm.captureOriginCountryIso || '').trim().length < 2) {
        setMessage(t('marketplace.wcOriginRequired'))
        setSavingListing(false)
        return
      }
      const { requestBoost, ...rest } = listingForm
      const isoRaw = listingForm.captureOriginCountryIso || ''
      const data = await marketplaceService.createListing({
        ...rest,
        captureOriginCountryIso: listingForm.wildCaught ? isoRaw.trim().toUpperCase().slice(0, 2) : null,
        priceAmount: listingForm.priceAmount ? Number(listingForm.priceAmount) : null,
        requestListingBoost: !!requestBoost,
      })
      if (data?.boostCheckoutUrl) {
        window.location.assign(data.boostCheckoutUrl)
        return
      }
      setListingForm(EMPTY_LISTING_FORM)
      await loadMine()
      queryClient.invalidateQueries({ queryKey: keeperProfileKeys.all })
      setMessage(
        data?.boostAppliedViaCredit ? t('marketplace.listingBoostAppliedViaCredit') : t('marketplace.createdOk')
      )
    } catch (err) {
      setMessage(err?.response?.data?.error || t('marketplace.error'))
    } finally {
      setSavingListing(false)
    }
  }

  const updateListingStatus = async (listingId, status) => {
    setMessage('')
    try {
      await marketplaceService.updateListingStatus(listingId, status)
      await loadMine()
      queryClient.invalidateQueries({ queryKey: keeperProfileKeys.all })
    } catch (err) {
      setMessage(err?.response?.data?.error || t('marketplace.error'))
    }
  }

  const filteredMine = useMemo(() => {
    const list = myListings || []
    if (statusFilter === 'all') return list
    return list.filter((l) => String(l.status || '').toLowerCase() === statusFilter)
  }, [myListings, statusFilter])
  const activeListingsCount = useMemo(
    () => (myListings || []).filter((l) => String(l.status || '').toLowerCase() === 'active').length,
    [myListings]
  )

  const statusLabel = (s) => {
    const key = String(s || '').toLowerCase()
    if (key === 'sold') return t('marketplace.listingStatusSold')
    if (key === 'hidden') return t('marketplace.listingStatusHidden')
    return t('marketplace.listingStatusActive')
  }

  const storefrontOnboarding = useMemo(() => {
    const checks = [
      !!String(myProfile.handle || '').trim(),
      !!String(myProfile.storefrontName || '').trim(),
      !!String(myProfile.storefrontShippingPolicy || '').trim(),
      !!String(myProfile.storefrontLagPolicy || '').trim(),
      myListings.some((l) => String(l.status || '').toLowerCase() === 'active'),
    ]
    const completed = checks.filter(Boolean).length
    return {
      completed,
      total: checks.length,
      percent: Math.round((completed / checks.length) * 100),
      items: checks,
    }
  }, [myListings, myProfile.handle, myProfile.storefrontLagPolicy, myProfile.storefrontName, myProfile.storefrontShippingPolicy])

  const storefrontHealth = useMemo(() => {
    const hasTagline = !!String(myProfile.storefrontTagline || '').trim()
    const hasContacts = !!String(myProfile.contactWhatsapp || '').trim() || !!String(myProfile.contactInstagram || '').trim()
    const activeListings = myListings.filter((l) => String(l.status || '').toLowerCase() === 'active').length
    const checks = [
      storefrontOnboarding.items[0],
      storefrontOnboarding.items[1],
      storefrontOnboarding.items[2],
      storefrontOnboarding.items[3],
      activeListings > 0,
      activeListings >= 3,
      hasTagline,
      hasContacts,
    ]
    const points = checks.filter(Boolean).length
    const total = checks.length
    const percent = Math.round((points / total) * 100)
    return { percent, points, total }
  }, [myListings, myProfile.contactInstagram, myProfile.contactWhatsapp, myProfile.storefrontTagline, storefrontOnboarding.items])

  const saveStorefrontProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    setMessage('')
    try {
      await marketplaceService.saveMyProfile({
        handle: myProfile.handle || null,
        country: myProfile.country || null,
        state: myProfile.state || null,
        city: myProfile.city || null,
        contactWhatsapp: myProfile.contactWhatsapp || null,
        contactInstagram: myProfile.contactInstagram || null,
        storefrontName: myProfile.storefrontName || null,
        storefrontTagline: myProfile.storefrontTagline || null,
        storefrontShippingPolicy: myProfile.storefrontShippingPolicy || null,
        storefrontLagPolicy: myProfile.storefrontLagPolicy || null,
        shipsTo: Array.isArray(myProfile.shipsTo) ? myProfile.shipsTo : [],
      })
      await loadMine()
      setMessage(t('marketplace.profileSaved'))
    } catch (err) {
      setMessage(err?.response?.data?.error || t('marketplace.error'))
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <div className="ta-premium-page">
      <Navbar />
      <div className="container mt-4 ta-premium-shell">
        <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap mb-3">
          <div>
            <Link to="/marketplace" className="btn btn-sm btn-outline-secondary mb-2">
              {t('marketplace.sellerBackBrowse')}
            </Link>
            <h1 className="h4 mb-1">{t('marketplace.sellerHubTitle')}</h1>
            <p className="small text-muted mb-0">{t('marketplace.sellerHubSubtitle')}</p>
          </div>
          {user && (
            <div className="d-flex align-items-center gap-2">
              <img
                src={imgUrl(myProfile.profilePhoto || user?.profilePhoto) || '/spider-default.png'}
                alt=""
                style={{ width: 44, height: 44, borderRadius: 999, objectFit: 'cover' }}
              />
              <div className="small">
                <div className="fw-semibold">{user.displayName || 'Keeper'}</div>
                {(myProfile.handle || user.publicHandle) && (
                  <PublicKeeperHandle
                    handle={myProfile.handle || user.publicHandle}
                    displayName={user.displayName || 'Keeper'}
                    profilePhoto={myProfile.profilePhoto || null}
                    className="text-muted"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <VendorVerificationCard user={user} />

        {message && <div className="alert alert-info small py-2">{message}</div>}

        <div className="card border-0 shadow-sm ta-premium-pane mb-4">
          <div className="card-body">
            <div className="border rounded p-2 mb-3" style={{ borderColor: 'var(--ta-border)' }}>
              <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                <div>
                  <div className="small fw-semibold">{t('marketplace.programTierLabel')}</div>
                  <div className="small text-muted">
                    {sellerProgram.tier === 'vendor'
                      ? t('marketplace.sellerTierVendor')
                      : sellerProgram.tier === 'pro'
                        ? t('marketplace.sellerTierPro')
                        : t('marketplace.sellerTierCommunity')}
                  </div>
                </div>
                <span className="badge bg-secondary">
                  {activeListingsCount}/{sellerProgram.activeListingLimit} {t('marketplace.activeListingsLabel')}
                </span>
              </div>
              <div className="small text-muted mt-2">
                {sellerProgram.tier === 'vendor'
                  ? t('marketplace.vendorBenefitsLive')
                  : sellerProgram.tier === 'pro'
                    ? t('marketplace.proBenefitsLive')
                    : t('marketplace.communityLimitHint')}
              </div>
              {vendorBoostCredits > 0 && (
                <div className="small mt-2 fw-semibold" style={{ color: 'var(--ta-purple)' }}>
                  {t('marketplace.vendorBoostCreditsBalance', { count: vendorBoostCredits })}
                </div>
              )}
              {!sellerProgram.reviewedVendor && (
                <div className="mt-2">
                  <Link
                    to="/pro#vendor-activation"
                    className="btn btn-sm btn-warning"
                    onClick={() => {
                      try {
                        localStorage.setItem('tarantulapp-pro-audience', 'seller')
                      } catch (_) {
                        /* ignore */
                      }
                    }}
                  >
                    {t('marketplace.vendorApplyNow')}
                  </Link>
                </div>
              )}
            </div>
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
              <div>
                <h2 className="h6 mb-1">{t('marketplace.storefrontSetupTitle')}</h2>
                <p className="small text-muted mb-0">{t('marketplace.storefrontSetupSub')}</p>
              </div>
              {(myProfile.handle || user?.publicHandle) && (
                <Link
                  to={`/shop/${encodeURIComponent(myProfile.handle || user?.publicHandle || '')}`}
                  className="btn btn-sm btn-outline-dark"
                >
                  {t('marketplace.listingDetailVisitStore')}
                </Link>
              )}
            </div>

            <div className="mb-3">
              <div className="d-flex justify-content-between small mb-1">
                <span>{t('marketplace.storefrontOnboardingProgress')}</span>
                <span>{storefrontOnboarding.completed}/{storefrontOnboarding.total}</span>
              </div>
              <div className="progress" style={{ height: 8 }}>
                <div className="progress-bar bg-warning" style={{ width: `${storefrontOnboarding.percent}%` }} />
              </div>
            </div>
            <div className="mb-3 p-2 rounded border" style={{ borderColor: 'var(--ta-border)' }}>
              <div className="d-flex justify-content-between small mb-1">
                <span>{t('marketplace.storefrontHealthScore')}</span>
                <span>{storefrontHealth.percent}%</span>
              </div>
              <div className="progress" style={{ height: 8 }}>
                <div className="progress-bar bg-success" style={{ width: `${storefrontHealth.percent}%` }} />
              </div>
              <div className="small text-muted mt-1">
                {t('marketplace.storefrontHealthHint', {
                  done: storefrontHealth.points,
                  total: storefrontHealth.total,
                })}
              </div>
            </div>

            <form onSubmit={saveStorefrontProfile} className="small">
              <div className="row g-2">
                <div className="col-md-4">
                  <input
                    className="form-control form-control-sm"
                    placeholder={t('marketplace.fieldHandle')}
                    value={myProfile.handle}
                    onChange={(e) => setMyProfile((p) => ({ ...p, handle: e.target.value }))}
                  />
                </div>
                <div className="col-md-4">
                  <input
                    className="form-control form-control-sm"
                    placeholder={t('marketplace.storefrontNameLabel')}
                    value={myProfile.storefrontName}
                    onChange={(e) => setMyProfile((p) => ({ ...p, storefrontName: e.target.value }))}
                  />
                </div>
                <div className="col-md-4">
                  <input
                    className="form-control form-control-sm"
                    placeholder={t('marketplace.storefrontTaglineLabel')}
                    value={myProfile.storefrontTagline}
                    onChange={(e) => setMyProfile((p) => ({ ...p, storefrontTagline: e.target.value }))}
                  />
                </div>
              </div>
              <div className="row g-2 mt-1">
                <div className="col-md-6">
                  <textarea
                    className="form-control form-control-sm"
                    rows={2}
                    placeholder={t('marketplace.storefrontShippingPolicyLabel')}
                    value={myProfile.storefrontShippingPolicy}
                    onChange={(e) => setMyProfile((p) => ({ ...p, storefrontShippingPolicy: e.target.value }))}
                  />
                </div>
                <div className="col-md-6">
                  <textarea
                    className="form-control form-control-sm"
                    rows={2}
                    placeholder={t('marketplace.storefrontLagPolicyLabel')}
                    value={myProfile.storefrontLagPolicy}
                    onChange={(e) => setMyProfile((p) => ({ ...p, storefrontLagPolicy: e.target.value }))}
                  />
                </div>
              </div>

              <div className="row g-2 mt-1">
                <div className="col-12">
                  <label className="form-label small mb-1" style={{ color: 'var(--ta-text-muted)' }}>
                    {t('marketplace.shipsToLabel')}
                  </label>
                  <div className="d-flex flex-wrap gap-2">
                    {SHIPS_TO_OPTIONS.map((opt) => {
                      const selected = Array.isArray(myProfile.shipsTo) && myProfile.shipsTo.includes(opt.code)
                      return (
                        <button
                          key={opt.code}
                          type="button"
                          className={`btn btn-sm ${selected ? 'btn-dark' : 'btn-outline-secondary'}`}
                          onClick={() => setMyProfile((p) => {
                            const current = Array.isArray(p.shipsTo) ? p.shipsTo : []
                            const next = current.includes(opt.code)
                              ? current.filter((c) => c !== opt.code)
                              : [...current, opt.code]
                            return { ...p, shipsTo: next }
                          })}
                          aria-pressed={selected}
                        >
                          {opt.code} · {opt.label}
                        </button>
                      )
                    })}
                  </div>
                  <p className="small text-muted mb-0 mt-1">{t('marketplace.shipsToHint')}</p>
                </div>
              </div>

              <div className="row g-2 mt-1">
                <div className="col-md-6">
                  <input
                    className="form-control form-control-sm"
                    placeholder={t('marketplace.storefrontWhatsappLabel')}
                    value={myProfile.contactWhatsapp}
                    onChange={(e) => setMyProfile((p) => ({ ...p, contactWhatsapp: e.target.value }))}
                  />
                </div>
                <div className="col-md-6">
                  <input
                    className="form-control form-control-sm"
                    placeholder={t('marketplace.storefrontInstagramLabel')}
                    value={myProfile.contactInstagram}
                    onChange={(e) => setMyProfile((p) => ({ ...p, contactInstagram: e.target.value }))}
                  />
                </div>
              </div>
              <button className="btn btn-sm btn-dark mt-2" disabled={savingProfile}>
                {savingProfile ? t('common.saving') : t('marketplace.saveProfile')}
              </button>
            </form>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-lg-5">
            <div className="card border-0 shadow-sm ta-premium-pane h-100">
              <div className="card-body">
                <h2 className="h6 mb-3">{t('marketplace.publishTitle')}</h2>
                <p className="small text-muted mb-2">
                  {t('marketplace.sellerLegalNotice')}{' '}
                  <Link to="/terms" target="_blank" rel="noreferrer">{t('auth.legalTerms')}</Link>
                  {' '}·{' '}
                  <Link to="/privacy" target="_blank" rel="noreferrer">{t('auth.legalPrivacy')}</Link>
                  {' '}·{' '}
                  <Link to="/marketplace-policy" target="_blank" rel="noreferrer">{t('legal.marketplacePolicy.title')}</Link>
                </p>
                <div className="small text-muted mb-3">
                  <div className="fw-semibold mb-1">{t('marketplace.orderChecklistTitle')}</div>
                  <ul className="mb-0 ps-3">
                    <li>{t('marketplace.orderChecklistRule1')}</li>
                    <li>{t('marketplace.orderChecklistRule2')}</li>
                    <li>{t('marketplace.orderChecklistRule5')}</li>
                  </ul>
                </div>
                <form onSubmit={submitListing} className="small">
                  <label className="form-label small mb-1" style={{ color: 'var(--ta-text-muted)' }}>
                    {t('marketplace.fieldListingCategory')}
                  </label>
                  <select
                    className="form-select form-select-sm mb-2"
                    value={listingForm.listingCategory}
                    onChange={(e) => setListingForm((f) => ({ ...f, listingCategory: e.target.value }))}
                  >
                    {sellerProgram.allowedListingCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {t(`marketplace.category.${cat}`)}
                      </option>
                    ))}
                  </select>
                  {sellerProgram.tier === 'community' && (
                    <p className="small text-muted mb-2">{t('marketplace.communityListingRules')}</p>
                  )}
                  <input className="form-control form-control-sm mb-2" placeholder={t('marketplace.fieldTitle')}
                    required value={listingForm.title} onChange={(e) => setListingForm((f) => ({ ...f, title: e.target.value }))} />
                  <input className="form-control form-control-sm mb-2" placeholder={t('marketplace.fieldSpecies')}
                    value={listingForm.speciesName} onChange={(e) => setListingForm((f) => ({ ...f, speciesName: e.target.value }))} />
                  <textarea className="form-control form-control-sm mb-2" rows={3} placeholder={t('marketplace.fieldDescription')}
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
                  {sellerProgram.tradeCertificationRequired && (
                  <div className="border rounded p-2 mb-2" style={{ background: 'rgba(0,0,0,0.04)' }}>
                    <p className="small fw-semibold mb-2">{t('marketplace.tradeDisclosureSectionTitle')}</p>
                    <div className="form-check mb-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="seller-wild-caught"
                        checked={!!listingForm.wildCaught}
                        onChange={(e) =>
                          setListingForm((f) => ({
                            ...f,
                            wildCaught: e.target.checked,
                            captureOriginCountryIso: e.target.checked ? f.captureOriginCountryIso : '',
                          }))
                        }
                      />
                      <label className="form-check-label small" htmlFor="seller-wild-caught" style={{ cursor: 'pointer' }}>
                        {t('marketplace.wildCaughtSellerLabel')}
                      </label>
                    </div>
                    {listingForm.wildCaught && (
                      <input
                        className="form-control form-control-sm mb-2"
                        maxLength={2}
                        placeholder={t('marketplace.captureIsoPlaceholder')}
                        value={listingForm.captureOriginCountryIso}
                        onChange={(e) =>
                          setListingForm((f) => ({
                            ...f,
                            captureOriginCountryIso: e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2),
                          }))
                        }
                      />
                    )}
                    <label className="form-label small mb-1" style={{ color: 'var(--ta-text-muted)' }}>
                      {t('marketplace.regulatoryPermitRefsLabel')}
                    </label>
                    <textarea
                      className="form-control form-control-sm mb-2"
                      rows={2}
                      placeholder={t('marketplace.regulatoryPermitRefsPlaceholder')}
                      value={listingForm.regulatoryPermitRefs}
                      onChange={(e) => setListingForm((f) => ({ ...f, regulatoryPermitRefs: e.target.value }))}
                    />
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="seller-trade-certifies"
                        required
                        checked={!!listingForm.sellerCertifiesLegalTradeCompliance}
                        onChange={(e) =>
                          setListingForm((f) => ({ ...f, sellerCertifiesLegalTradeCompliance: e.target.checked }))
                        }
                      />
                      <label className="form-check-label small" htmlFor="seller-trade-certifies" style={{ cursor: 'pointer' }}>
                        {t('marketplace.sellerLegalCertificationLabel')}
                      </label>
                    </div>
                  </div>
                  )}
                  {boostOfferAvailable && sellerProgram.canRequestBoost && (
                    <div className="form-check mb-2 p-2 rounded" style={{ background: 'rgba(0,0,0,0.08)' }}>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="seller-listing-request-boost"
                        checked={!!listingForm.requestBoost}
                        onChange={(e) => setListingForm((f) => ({ ...f, requestBoost: e.target.checked }))}
                      />
                      <label className="form-check-label" htmlFor="seller-listing-request-boost" style={{ cursor: 'pointer' }}>
                        {vendorBoostCredits > 0
                          ? t('marketplace.listingBoostLabelCredit', { count: vendorBoostCredits })
                          : t('marketplace.listingBoostLabel')}
                        <span className="d-block small text-muted mt-1">
                          {vendorBoostCredits > 0
                            ? t('marketplace.listingBoostHintCredit')
                            : t('marketplace.listingBoostHint')}
                        </span>
                      </label>
                    </div>
                  )}
                  {boostOfferAvailable && !sellerProgram.canRequestBoost && (
                    <div className="small text-muted mb-2">
                      {t('marketplace.boostLockedHint')}
                    </div>
                  )}
                  <button className="btn btn-sm btn-dark w-100" disabled={savingListing}>
                    {savingListing ? t('common.saving') : t('marketplace.publishBtn')}
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="col-lg-7">
            <div className="card border-0 shadow-sm ta-premium-pane h-100">
              <div className="card-body">
                <h2 className="h6 mb-3">{t('marketplace.myListings')}</h2>
                <div className="btn-group btn-group-sm flex-wrap mb-3" role="group">
                  {FILTERS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`btn ${statusFilter === f ? 'btn-dark' : 'btn-outline-secondary'}`}
                      onClick={() => setStatusFilter(f)}
                    >
                      {f === 'all' && t('marketplace.listingFilterAll')}
                      {f === 'active' && t('marketplace.listingFilterActive')}
                      {f === 'sold' && t('marketplace.listingFilterSold')}
                      {f === 'hidden' && t('marketplace.listingFilterHidden')}
                    </button>
                  ))}
                </div>
                {filteredMine.length === 0 ? (
                  <p className="text-muted small mb-0">{t('marketplace.noneMineFiltered')}</p>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {filteredMine.map((l) => {
                      const st = String(l.status || '').toLowerCase()
                      return (
                        <div key={l.id} className="border rounded p-2 d-flex gap-2 align-items-start">
                          <div className="flex-shrink-0 rounded overflow-hidden bg-light" style={{ width: 56, height: 56 }}>
                            {l.imageUrl ? (
                              <img src={imgUrl(l.imageUrl) || l.imageUrl} alt="" className="w-100 h-100" style={{ objectFit: 'cover' }} />
                            ) : (
                              <div className="w-100 h-100 d-flex align-items-center justify-content-center small text-muted">?</div>
                            )}
                          </div>
                          <div className="flex-grow-1 min-w-0">
                            <div className="fw-semibold text-truncate">{l.title}</div>
                            <span className="badge bg-secondary mb-1">{statusLabel(st)}</span>
                            <div className="small text-muted">
                              {[l.city, l.state, l.country].filter(Boolean).join(' ? ') || '\u2014'}
                            </div>
                            <div className="d-flex flex-wrap gap-1 mt-2">
                              {st === 'active' && (
                                <>
                                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => updateListingStatus(l.id, 'sold')}>
                                    {t('marketplace.markSold')}
                                  </button>
                                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => updateListingStatus(l.id, 'hidden')}>
                                    {t('marketplace.hideListing')}
                                  </button>
                                </>
                              )}
                              {st === 'hidden' && (
                                <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => updateListingStatus(l.id, 'active')}>
                                  {t('marketplace.relistListing')}
                                </button>
                              )}
                              {st === 'sold' && (
                                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => updateListingStatus(l.id, 'hidden')}>
                                  {t('marketplace.archiveListing')}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {user && (
          <div className="card border-0 shadow-sm ta-premium-pane mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                <div>
                  <h2 className="h6 mb-1">{t('marketplace.analytics.title')}</h2>
                  <p className="small text-muted mb-0">{t('marketplace.analytics.blurb')}</p>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => loadAnalytics()}
                  disabled={analyticsLoading}
                >
                  {analyticsLoading ? t('common.loading') : t('marketplace.analytics.refresh')}
                </button>
              </div>

              {analyticsLoading && !analytics && (
                <p className="small text-muted mb-0">{t('common.loading')}</p>
              )}

              {analytics && (
                <>
                  <div className="row g-2 mb-3">
                    <div className="col-6 col-md-3">
                      <div className="border rounded p-2 small">
                        <div className="text-muted">{t('marketplace.analytics.views7d')}</div>
                        <div className="h6 mb-0">{analytics.totals?.views7d ?? 0}</div>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="border rounded p-2 small">
                        <div className="text-muted">{t('marketplace.analytics.views30d')}</div>
                        <div className="h6 mb-0">{analytics.totals?.views30d ?? 0}</div>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="border rounded p-2 small">
                        <div className="text-muted">{t('marketplace.analytics.contactTaps30d')}</div>
                        <div className="h6 mb-0">{analytics.totals?.contactTaps30d ?? 0}</div>
                      </div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="border rounded p-2 small">
                        <div className="text-muted">{t('marketplace.analytics.tapRate30d')}</div>
                        <div className="h6 mb-0">
                          {Math.round(((analytics.totals?.contactTapRate30d ?? 0) * 100) * 10) / 10}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {analytics.boostRoi && (
                    <div className="border rounded p-3 mb-3 small">
                      <h3 className="h6 mb-1">{t('marketplace.analytics.boostRoiTitle')}</h3>
                      <p className="text-muted mb-2">{t('marketplace.analytics.boostRoiBlurb')}</p>
                      {analytics.boostRoi.viewsUpliftPct != null ? (
                        <>
                          <p className="mb-2 fw-semibold">
                            {t('marketplace.analytics.boostRoiUplift', { pct: analytics.boostRoi.viewsUpliftPct })}
                          </p>
                          <div className="row g-2">
                            <div className="col-6">
                              <div className="text-muted">{t('marketplace.analytics.boostRoiBoostedAvg')}</div>
                              <div className="fw-semibold">{analytics.boostRoi.avgViews30dBoosted ?? 0}</div>
                            </div>
                            <div className="col-6">
                              <div className="text-muted">{t('marketplace.analytics.boostRoiNonBoostedAvg')}</div>
                              <div className="fw-semibold">{analytics.boostRoi.avgViews30dNonBoosted ?? 0}</div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="text-muted mb-0">{t('marketplace.analytics.boostRoiNoCompare')}</p>
                      )}
                    </div>
                  )}

                  {Array.isArray(analytics.perListing) && analytics.perListing.length === 0 && (
                    <p className="small text-muted mb-0">{t('marketplace.analytics.empty')}</p>
                  )}

                  {Array.isArray(analytics.perListing) && analytics.perListing.length > 0 && (
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0 small">
                        <thead>
                          <tr>
                            <th>{t('marketplace.analytics.colTitle')}</th>
                            <th className="text-end">{t('marketplace.analytics.colViews7d')}</th>
                            <th className="text-end">{t('marketplace.analytics.colViews30d')}</th>
                            <th className="text-end">{t('marketplace.analytics.colTaps7d')}</th>
                            <th className="text-end">{t('marketplace.analytics.colTaps30d')}</th>
                            <th className="text-end">{t('marketplace.analytics.colTapRate')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.perListing.slice(0, 25).map((row) => (
                            <tr key={row.listingId}>
                              <td className="text-truncate" style={{ maxWidth: 240 }}>{row.title}</td>
                              <td className="text-end">{row.views7d ?? 0}</td>
                              <td className="text-end">{row.views30d ?? 0}</td>
                              <td className="text-end">{row.contactTaps7d ?? 0}</td>
                              <td className="text-end">{row.contactTaps30d ?? 0}</td>
                              <td className="text-end">
                                {Math.round(((row.contactTapRate30d ?? 0) * 100) * 10) / 10}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="small text-muted mt-2 mb-0">{t('marketplace.analytics.footnote')}</p>
                </>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 text-center">
          <Link to="/marketplace/messages" className="btn btn-sm btn-outline-secondary">
            {t('marketplace.messagesInboxCta')}
          </Link>
        </div>
      </div>
    </div>
  )
}
