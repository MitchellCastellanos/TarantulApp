import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import marketplaceService from '../services/marketplaceService'
import moderationService from '../services/moderationService'
import { COUNTRY_OPTIONS, STATES_BY_COUNTRY, CITIES_BY_STATE } from '../constants/locations'
import { imgUrl } from '../services/api'
import BrandLogoMark from '../components/BrandLogoMark'

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

export default function MarketplacePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [listings, setListings] = useState([])
  const [officialVendors, setOfficialVendors] = useState([])
  const [myListings, setMyListings] = useState([])
  const [myProfile, setMyProfile] = useState(EMPTY_PROFILE_FORM)
  const [listingForm, setListingForm] = useState(EMPTY_LISTING_FORM)
  const [vendorLeadForm, setVendorLeadForm] = useState(EMPTY_VENDOR_LEAD_FORM)
  const [loading, setLoading] = useState(false)
  const [savingListing, setSavingListing] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingVendorLead, setSavingVendorLead] = useState(false)
  const [message, setMessage] = useState('')
  const [myReputation, setMyReputation] = useState(null)
  const [myBadgesProgress, setMyBadgesProgress] = useState(null)
  const [filters, setFilters] = useState({ country: '', state: '', city: '', nearMe: true })
  const nearCountry = filters.nearMe ? (myProfile.country || user?.profileCountry || '') : undefined
  const nearState = filters.nearMe ? (myProfile.state || user?.profileState || '') : undefined
  const nearCity = filters.nearMe ? (myProfile.city || user?.profileCity || '') : undefined

  const loadPublicListings = async () => {
    const data = await marketplaceService.listPublic({
      q: query || undefined,
      country: filters.country || undefined,
      state: filters.state || undefined,
      city: filters.city || undefined,
      nearCountry,
      nearState,
      nearCity,
    })
    setListings(Array.isArray(data) ? data : [])
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
  const uploadProfilePhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const updated = await marketplaceService.uploadProfilePhoto(file)
      setMyProfile((f) => ({ ...f, profilePhoto: updated?.profilePhoto || '' }))
      setMessage(t('marketplace.photoUpdated'))
    } catch (err) {
      setMessage(err?.response?.data?.error || t('marketplace.error'))
    }
  }


  useEffect(() => {
    setLoading(true)
    Promise.all([loadPublicListings(), loadOfficialVendors(), loadMine().catch(() => {})])
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    Promise.all([loadPublicListings(), loadOfficialVendors()]).catch(() => {})
  }, [filters, query, myProfile.country, myProfile.state, myProfile.city])

  const visibleListings = useMemo(() => listings.filter((l) => l.status !== 'hidden'), [listings])

  const submitListing = async (e) => {
    e.preventDefault()
    setSavingListing(true)
    setMessage('')
    try {
      await marketplaceService.createListing({
        ...listingForm,
        priceAmount: listingForm.priceAmount ? Number(listingForm.priceAmount) : null,
      })
      setListingForm(EMPTY_LISTING_FORM)
      await Promise.all([loadPublicListings(), loadMine()])
      setMessage(t('marketplace.createdOk'))
    } catch (err) {
      setMessage(err?.response?.data?.error || t('marketplace.error'))
    } finally {
      setSavingListing(false)
    }
  }

  const saveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    setMessage('')
    try {
      await marketplaceService.saveMyProfile(myProfile)
      setMessage(t('marketplace.profileSaved'))
    } catch (err) {
      setMessage(err?.response?.data?.error || t('marketplace.error'))
    } finally {
      setSavingProfile(false)
    }
  }

  const markSold = async (listingId) => {
    await marketplaceService.updateListingStatus(listingId, 'sold')
    await Promise.all([loadPublicListings(), loadMine()])
  }

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
  const listingStates = STATES_BY_COUNTRY[listingForm.country || 'Mexico'] || []
  const listingCities = CITIES_BY_STATE[listingForm.state] || []
  const filterCities = CITIES_BY_STATE[filters.state] || []

  return (
    <div>
      <Navbar />
      <div className="container mt-4">
        <div className="d-flex flex-wrap justify-content-between gap-2 align-items-center mb-3">
          <h4 className="mb-0">{t('marketplace.title')}</h4>
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

        {message && <div className="alert alert-info small py-2">{message}</div>}

        <div className="ta-marketplace-community-intro mb-4 p-3 p-md-4 rounded-3">
          <h2 className="h5 fw-bold mb-2" style={{ color: 'var(--ta-parchment)' }}>{t('marketplace.pageFocusTitle')}</h2>
          <p className="small mb-2" style={{ color: 'var(--ta-text)', lineHeight: 1.55 }}>{t('marketplace.communityIntro')}</p>
          <p className="small mb-0" style={{ color: 'var(--ta-text-muted)', lineHeight: 1.55 }}>{t('marketplace.communityDisclaimer')}</p>
        </div>

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

        <div className="row g-4">
          <div className="col-lg-8">
            <div className="mb-3 pb-2 border-bottom" style={{ borderColor: 'var(--ta-border)' }}>
              <h3 className="h5 fw-bold mb-1" style={{ color: 'var(--ta-parchment)' }}>{t('marketplace.communityTitle')}</h3>
              <p className="small text-muted mb-0">{t('marketplace.communitySubtitle')}</p>
            </div>
            <div className="row g-3">
              {loading && <p className="text-muted small">{t('common.loading')}</p>}
              {!loading && visibleListings.length === 0 && (
                <p className="text-muted small">{t('marketplace.empty')}</p>
              )}
              {visibleListings.map((l) => (
                <div className="col-md-6" key={l.id}>
                  <div className="card border-0 shadow-sm h-100">
                    {l.imageUrl ? (
                      <img src={l.imageUrl} alt={l.title} className="card-img-top" style={{ maxHeight: 200, objectFit: 'cover' }} />
                    ) : null}
                    <div className="card-body">
                      <h6 className="fw-bold">{l.title}</h6>
                      <p className="small text-muted mb-2">{l.speciesName || '-'}</p>
                      <p className="small mb-2">{l.description || '-'}</p>
                      <div className="small text-muted mb-2">
                        {[l.city, l.state, l.country].filter(Boolean).join(' · ') || '-'}
                      </div>
                      <div className="fw-semibold mb-2">
                        {l.priceAmount != null ? `${l.priceAmount} ${l.currency || ''}` : t('marketplace.priceOnRequest')}
                      </div>
                      <div className="d-flex gap-2 flex-wrap">
                        <Link to={`/marketplace/keeper/${l.sellerUserId}`} className="btn btn-sm btn-outline-dark">
                          {t('marketplace.viewSeller')}
                        </Link>
                        {String(user?.id || '') !== String(l.sellerUserId) && (
                          user ? (
                            <Link
                              to={`/comunidad?tab=spood&openSeller=${encodeURIComponent(l.sellerUserId)}&openListing=${encodeURIComponent(l.id)}`}
                              className="btn btn-sm btn-dark"
                            >
                              {t('marketplace.messageSeller')}
                            </Link>
                          ) : (
                            <Link
                              to="/login"
                              state={{
                                redirectAfterAuth:
                                  `/comunidad?tab=spood&openSeller=${encodeURIComponent(l.sellerUserId)}&openListing=${encodeURIComponent(l.id)}`,
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
              <div className="card border-0 shadow-sm">
                <div className="card-body small">
                  <p className="mb-2">{t('marketplace.loginToSell')}</p>
                  <Link to="/login" className="btn btn-sm btn-dark">{t('nav.login', 'Login')}</Link>
                </div>
              </div>
            ) : (
              <>
                <div className="card border-0 shadow-sm mb-3">
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
                      <input className="form-control form-control-sm mb-2" placeholder={t('marketplace.fieldImage')}
                        value={listingForm.imageUrl} onChange={(e) => setListingForm((f) => ({ ...f, imageUrl: e.target.value }))} />
                      <button className="btn btn-sm btn-dark w-100" disabled={savingListing}>
                        {savingListing ? t('common.saving') : t('marketplace.publishBtn')}
                      </button>
                    </form>
                  </div>
                </div>

                <div className="card border-0 shadow-sm mb-3">
                  <div className="card-body">
                    <h6>{t('marketplace.keeperProfileTitle')}</h6>
                    {myReputation && (
                      <div className="p-2 rounded mb-2 ta-marketplace-reputation-strip">
                        <div className="small fw-semibold">
                          {t('marketplace.reputationTitle')}: {t('marketplace.reputationLine', { tier: myReputation.tier, score: myReputation.score })}
                        </div>
                        <div className="progress mt-1" style={{ height: 7 }}>
                          <div className="progress-bar bg-warning" style={{ width: `${Math.min(100, Number(myReputation.score || 0))}%` }} />
                        </div>
                      </div>
                    )}
                    {myBadgesProgress && (
                      <div className="mb-2">
                        {Object.entries(myBadgesProgress).map(([key, p]) => {
                          const target = Number(p?.target || 0)
                          const current = Number(p?.current || 0)
                          const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 100
                          return (
                            <div key={key} className="mb-1">
                              <div className="small">{p?.nextLabel}</div>
                              <div className="progress" style={{ height: 5 }}>
                                <div className="progress-bar bg-info" style={{ width: `${percent}%` }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    <form onSubmit={saveProfile} className="small">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <img src={imgUrl(myProfile.profilePhoto) || '/spider-default.png'} alt="profile" style={{ width: 48, height: 48, borderRadius: 999, objectFit: 'cover' }} />
                        <input type="file" className="form-control form-control-sm" accept="image/*" onChange={uploadProfilePhoto} />
                      </div>
                      <input className="form-control form-control-sm mb-2" placeholder={t('marketplace.fieldHandle')}
                        value={myProfile.handle} onChange={(e) => setMyProfile((f) => ({ ...f, handle: e.target.value }))} />
                      <textarea className="form-control form-control-sm mb-2" rows={2} placeholder={t('marketplace.fieldBio')}
                        value={myProfile.bio} onChange={(e) => setMyProfile((f) => ({ ...f, bio: e.target.value }))} />
                      <select className="form-select form-select-sm mb-2"
                        value={myProfile.country} onChange={(e) => setMyProfile((f) => ({ ...f, country: e.target.value, state: '', city: '' }))}>
                        {COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select className="form-select form-select-sm mb-2"
                        value={myProfile.state} onChange={(e) => setMyProfile((f) => ({ ...f, state: e.target.value, city: '' }))}>
                        <option value="">{t('marketplace.fieldState')}</option>
                        {(STATES_BY_COUNTRY[myProfile.country] || []).map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select className="form-select form-select-sm mb-2"
                        value={myProfile.city} onChange={(e) => setMyProfile((f) => ({ ...f, city: e.target.value }))}>
                        <option value="">{t('marketplace.fieldCity')}</option>
                        {(CITIES_BY_STATE[myProfile.state] || []).map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <input className="form-control form-control-sm mb-2" placeholder={t('marketplace.fieldFeatured')}
                        value={myProfile.featuredCollection} onChange={(e) => setMyProfile((f) => ({ ...f, featuredCollection: e.target.value }))} />
                      <button className="btn btn-sm btn-outline-dark w-100" disabled={savingProfile}>
                        {savingProfile ? t('common.saving') : t('marketplace.saveProfile')}
                      </button>
                    </form>
                  </div>
                </div>

                <div className="card border-0 shadow-sm">
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

        <details className="card border-0 shadow-sm mt-2 ta-marketplace-official-apply-details marketplace-official-apply-panel p-0 overflow-hidden">
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
