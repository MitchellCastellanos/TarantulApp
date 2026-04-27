import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import marketplaceService from '../services/marketplaceService'
import { COUNTRY_OPTIONS, STATES_BY_COUNTRY, CITIES_BY_STATE } from '../constants/locations'
import { imgUrl } from '../services/api'
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

const FILTERS = ['all', 'active', 'sold', 'hidden']

export default function MarketplaceSellerPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [myListings, setMyListings] = useState([])
  const [myProfile, setMyProfile] = useState({
    handle: '',
    profilePhoto: '',
    country: 'Mexico',
    state: '',
    city: '',
  })
  const [listingForm, setListingForm] = useState(EMPTY_LISTING_FORM)
  const [listingBoostAvailable, setListingBoostAvailable] = useState(false)
  const [savingListing, setSavingListing] = useState(false)
  const [uploadingListingImage, setUploadingListingImage] = useState(false)
  const [message, setMessage] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  usePageSeo({
    title: t('marketplace.sellerHubTitle'),
    description: t('marketplace.sellerHubSubtitle'),
    imageUrl: origin ? `${origin}/icon-512.png` : undefined,
    canonicalHref: origin ? `${origin}/marketplace/sell` : undefined,
    noindex: true,
  })

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
    })
  }, [user])

  useEffect(() => {
    loadMine().catch(() => {})
  }, [loadMine])

  useEffect(() => {
    marketplaceService
      .getListingBoostOffer()
      .then((d) => setListingBoostAvailable(!!d?.available))
      .catch(() => setListingBoostAvailable(false))
  }, [])

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
      await loadMine()
      setMessage(t('marketplace.createdOk'))
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
    } catch (err) {
      setMessage(err?.response?.data?.error || t('marketplace.error'))
    }
  }

  const filteredMine = useMemo(() => {
    const list = myListings || []
    if (statusFilter === 'all') return list
    return list.filter((l) => String(l.status || '').toLowerCase() === statusFilter)
  }, [myListings, statusFilter])

  const statusLabel = (s) => {
    const key = String(s || '').toLowerCase()
    if (key === 'sold') return t('marketplace.listingStatusSold')
    if (key === 'hidden') return t('marketplace.listingStatusHidden')
    return t('marketplace.listingStatusActive')
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

        {message && <div className="alert alert-info small py-2">{message}</div>}

        <div className="row g-4">
          <div className="col-lg-5">
            <div className="card border-0 shadow-sm ta-premium-pane h-100">
              <div className="card-body">
                <h2 className="h6 mb-3">{t('marketplace.publishTitle')}</h2>
                <form onSubmit={submitListing} className="small">
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
                  {listingBoostAvailable && (
                    <div className="form-check mb-2 p-2 rounded" style={{ background: 'rgba(0,0,0,0.08)' }}>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="seller-listing-request-boost"
                        checked={!!listingForm.requestBoost}
                        onChange={(e) => setListingForm((f) => ({ ...f, requestBoost: e.target.checked }))}
                      />
                      <label className="form-check-label" htmlFor="seller-listing-request-boost" style={{ cursor: 'pointer' }}>
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
                              <div className="w-100 h-100 d-flex align-items-center justify-content-center small text-muted">ù</div>
                            )}
                          </div>
                          <div className="flex-grow-1 min-w-0">
                            <div className="fw-semibold text-truncate">{l.title}</div>
                            <span className="badge bg-secondary mb-1">{statusLabel(st)}</span>
                            <div className="small text-muted">
                              {[l.city, l.state, l.country].filter(Boolean).join(' ù ') || '\u2014'}
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

        <div className="mt-4 text-center">
          <Link to="/marketplace/messages" className="btn btn-sm btn-outline-secondary">
            {t('marketplace.messagesInboxCta')}
          </Link>
        </div>
      </div>
    </div>
  )
}
