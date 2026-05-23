import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PublicShell from '../components/PublicShell'
import DiscoverSpeciesProfileSnippet from '../components/DiscoverSpeciesProfileSnippet'
import speciesService from '../services/speciesService'
import speciesWatchService from '../services/speciesWatchService'
import { useAuth } from '../context/AuthContext'
import { usePageSeo } from '../hooks/usePageSeo'
import { BRAND_WITH_TM } from '../constants/brand'
import { discoverHeroImageAbsoluteUrl, formatDiscoverSeoMetaLine } from '../utils/discoverSeo'
import SpeciesReferenceImage from '../components/SpeciesReferenceImage'
import { hasKeeperGradeSignal } from '../utils/speciesKeeperSignal'
import { formatListingPrice } from '../utils/listingShareTemplates'
import { decodeListingTitle, partnerListingImageUrl } from '../utils/listingDisplay'
import SpeciesTradeNoteBlock from '../components/SpeciesTradeNoteBlock'

function DiscoverSpeciesDetailSeo({ view, speciesId, seoSnapshot }) {
  const { t, i18n } = useTranslation()
  const sp = view.species
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const path = `/discover/species/${speciesId}`
  const canonicalHref = origin ? `${origin}${path}` : undefined
  const fallback512 = origin ? `${origin}/icon-512.png` : null
  const ogImage = discoverHeroImageAbsoluteUrl(sp, view.fallbackPhoto) || fallback512

  const metaLine = useMemo(() => formatDiscoverSeoMetaLine(sp, t), [sp, t, i18n.language])

  const description = useMemo(() => {
    const commonFrag = sp.commonName ? t('discover.seoCommonFragment', { common: sp.commonName }) : ''
    return t('discover.seoSpeciesDescription', {
      name: sp.scientificName,
      common: commonFrag,
      meta: metaLine,
    })
  }, [sp.scientificName, sp.commonName, metaLine, t, i18n.language])

  const title = useMemo(
    () => t('discover.seoSpeciesTitle', { name: sp.scientificName }),
    [sp.scientificName, t, i18n.language]
  )

  const jsonLd = useMemo(() => {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    const pageUrl = canonicalHref || (base ? `${base}${path}` : path)
    const gbif = sp.gbifUsageKey != null ? `https://www.gbif.org/species/${sp.gbifUsageKey}` : null
    const listings = seoSnapshot?.recentListings ?? []
    const listingItems = listings.map((l, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: base ? `${base}/marketplace/listing/${l.id}` : `/marketplace/listing/${l.id}`,
      name: l.title || sp.scientificName,
    }))
    return {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description,
      url: pageUrl,
      inLanguage: i18n.language,
      isPartOf: {
        '@type': 'WebSite',
        name: BRAND_WITH_TM,
        url: base || undefined,
      },
      about: {
        '@type': 'Taxon',
        name: sp.scientificName,
        ...(sp.commonName ? { alternateName: sp.commonName } : {}),
        ...(gbif ? { sameAs: gbif } : {}),
      },
      ...(listingItems.length > 0
        ? {
            mainEntity: {
              '@type': 'ItemList',
              name: sp.scientificName,
              numberOfItems: seoSnapshot?.activeListingCount ?? listingItems.length,
              itemListElement: listingItems,
            },
          }
        : {}),
    }
  }, [title, description, canonicalHref, path, sp, i18n.language, seoSnapshot])

  usePageSeo({
    title,
    description,
    imageUrl: ogImage,
    canonicalHref,
    jsonLd,
    jsonLdId: 'discover-species-jsonld',
  })
  return null
}

export default function DiscoverSpeciesDetailPage() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const hasPro = user?.hasProFeatures === true
  const [view, setView] = useState(null)
  const [seoSnapshot, setSeoSnapshot] = useState(null)
  const [err, setErr] = useState(false)
  const [clientPhoto, setClientPhoto] = useState(null)
  const [dbReferenceBroken, setDbReferenceBroken] = useState(false)
  const [watched, setWatched] = useState(false)
  const [watchBusy, setWatchBusy] = useState(false)
  const [watchMessage, setWatchMessage] = useState('')

  useEffect(() => {
    setClientPhoto(null)
    setDbReferenceBroken(false)
  }, [id])

  useEffect(() => {
    const sid = Number(id)
    if (!Number.isFinite(sid)) {
      setErr(true)
      return
    }
    setSeoSnapshot(null)
    speciesService
      .getDiscoverSpeciesView(sid)
      .then(setView)
      .catch(() => setErr(true))
    speciesService.getSeoSnapshot(sid).then(setSeoSnapshot).catch(() => setSeoSnapshot(null))
  }, [id])

  // Wishlist status check — only for signed-in users on catalog species.
  useEffect(() => {
    setWatched(false)
    setWatchMessage('')
    if (!token) return
    const sp = view?.species
    if (!sp?.id) return
    let cancelled = false
    speciesWatchService.status(sp.id)
      .then((r) => { if (!cancelled) setWatched(!!r?.watched) })
      .catch(() => { /* ignore */ })
    return () => { cancelled = true }
  }, [token, view?.species?.id])

  useEffect(() => {
    if (!view?.species) return
    const sp = view.species
    const hasRef = Boolean(sp.referencePhotoUrl?.trim()) && !dbReferenceBroken
    if (hasRef) return
    if (view.fallbackPhoto?.url) return
    const n = (sp.scientificName || '').trim()
    if (!n) return
    let cancelled = false
    speciesService.photoFallback(n).then((p) => {
      if (!cancelled && p?.url) setClientPhoto(p)
    })
    return () => {
      cancelled = true
    }
  }, [
    view?.species?.id,
    view?.fallbackPhoto?.url,
    view?.species?.referencePhotoUrl,
    view?.species?.scientificName,
    dbReferenceBroken,
  ])

  if (err) {
    return (
      <PublicShell>
        <p className="text-muted">{t('discover.speciesNotFound')}</p>
        <Link to="/discover">{t('common.back')}</Link>
      </PublicShell>
    )
  }

  if (!view?.species) {
    return (
      <PublicShell>
        <p className="text-muted">{t('common.loading')}</p>
      </PublicShell>
    )
  }

  const sp = view.species
  const addNewHref = `/tarantulas/new?speciesId=${sp.id}`
  const credit = view.fallbackPhoto || clientPhoto

  return (
    <PublicShell>
      <DiscoverSpeciesDetailSeo view={view} speciesId={id} seoSnapshot={seoSnapshot} />
      <div className="mx-auto" style={{ maxWidth: 720 }}>
        <button
          type="button"
          className="btn btn-link btn-sm text-decoration-none ps-0 mb-3"
          style={{ color: 'var(--ta-gold)' }}
          onClick={() => navigate(-1)}
        >
          {t('common.back')}
        </button>

        <DiscoverSpeciesProfileSnippet species={sp} variant="discover" nameAs="h1" />

        {!hasKeeperGradeSignal(sp) && (
          <p className="small mt-3 mb-0" style={{ color: 'var(--ta-text-muted)', lineHeight: 1.55 }} role="status">
            <span className="fst-italic" style={{ color: 'var(--ta-parchment)' }}>{t('species.sheetIncompleteTitle')}</span>
            {' '}
            {t('species.sheetIncompleteBody')}
          </p>
        )}

        <figure className="mt-3 mb-3">
          <SpeciesReferenceImage
            storedUrl={sp.referencePhotoUrl}
            fallbackUrl={view.fallbackPhoto?.url || clientPhoto?.url}
            alt=""
            className="img-fluid rounded border"
            style={{ borderColor: 'var(--ta-border)' }}
            onStoredUrlFailed={() => setDbReferenceBroken(true)}
          />
          {(!sp.referencePhotoUrl?.trim() || dbReferenceBroken) && credit?.attribution && (
            <figcaption className="small mt-1" style={{ color: 'var(--ta-text-muted)' }}>
              {credit.attribution}
              {credit.licenseCode ? ` · ${credit.licenseCode}` : ''}
              {credit.taxonPageUrl && (
                <>
                  {' '}
                  <a href={credit.taxonPageUrl} target="_blank" rel="noreferrer" className="text-reset">
                    {t('discover.sourceLink')}
                  </a>
                </>
              )}
            </figcaption>
          )}
        </figure>

        <p className="small mt-2 mb-0" style={{ color: 'var(--ta-text)' }}>
          {t('discover.seoSpeciesLead')}
        </p>

        <p className="small mt-3" style={{ color: 'var(--ta-text-muted)' }}>
          {t('discover.dataDisclaimer')}
        </p>

        {(seoSnapshot?.tradeNotes?.length ?? 0) > 0 && (
          <div className="mt-4 d-flex flex-column gap-3">
            {seoSnapshot.tradeNotes.map((note) => (
              <SpeciesTradeNoteBlock key={note.country} note={note} countryLabel={note.country} />
            ))}
          </div>
        )}

        <section className="mt-4" aria-labelledby="species-listings-heading">
          <h2 id="species-listings-heading" className="h6 fw-semibold" style={{ color: 'var(--ta-parchment)' }}>
            {t('discover.activeListingsForSpecies')}
          </h2>
          {seoSnapshot == null ? (
            <p className="small text-muted mb-0">{t('common.loading')}</p>
          ) : (seoSnapshot.recentListings?.length ?? 0) === 0 ? (
            <p className="small mb-0" style={{ color: 'var(--ta-text-muted)' }}>
              {t('discover.activeListingsEmpty')}
            </p>
          ) : (
            <>
              <p className="small mb-2" style={{ color: 'var(--ta-text-muted)' }}>
                {seoSnapshot.activeListingCount}
              </p>
              <div className="row g-3">
                {seoSnapshot.recentListings.map((l) => (
                  <div className="col-12 col-sm-6" key={l.id}>
                    <Link
                      to={`/marketplace/listing/${l.id}`}
                      className="card h-100 text-decoration-none border-0 shadow-sm ta-premium-pane"
                      style={{ color: 'inherit' }}
                    >
                      {(l.imageUrl || l.isPartner) && (
                        <img
                          src={
                            l.isPartner
                              ? partnerListingImageUrl(l.imageUrl) || '/spider-default.png'
                              : l.imageUrl || '/spider-default.png'
                          }
                          alt=""
                          className="card-img-top"
                          style={{ maxHeight: 120, objectFit: 'cover' }}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = '/spider-default.png'
                          }}
                        />
                      )}
                      <div className="card-body py-2">
                        <div className="fw-semibold small">{decodeListingTitle(l.title)}</div>
                        <div className="small" style={{ color: 'var(--ta-gold)' }}>
                          {formatListingPrice(l.priceAmount, l.currency, t)}
                        </div>
                        <div className="small text-muted">
                          {[l.city, l.state, l.country].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
              <Link to={`/marketplace?q=${encodeURIComponent(sp.scientificName)}`} className="btn btn-sm btn-link ps-0 mt-2">
                {t('discover.marketplaceHubCta')}
              </Link>
            </>
          )}
        </section>

        <section className="mt-4" aria-labelledby="species-molts-heading">
          <h2 id="species-molts-heading" className="h6 fw-semibold" style={{ color: 'var(--ta-parchment)' }}>
            {t('discover.communityMoltsForSpecies')}
          </h2>
          {seoSnapshot == null ? (
            <p className="small text-muted mb-0">{t('common.loading')}</p>
          ) : (seoSnapshot.communityMoltCount ?? 0) === 0 ? (
            <p className="small mb-0" style={{ color: 'var(--ta-text-muted)' }}>
              {t('discover.communityMoltsNone')}
            </p>
          ) : (
            <>
              <p className="small mb-1" style={{ color: 'var(--ta-text)' }}>
                {t('discover.communityMoltsCount', { count: seoSnapshot.communityMoltCount })}
              </p>
              {seoSnapshot.lastCommunityMoltAt && (
                <p className="small mb-0" style={{ color: 'var(--ta-text-muted)' }}>
                  {t('discover.communityMoltsLast', {
                    date: new Date(seoSnapshot.lastCommunityMoltAt).toLocaleDateString(i18n.language),
                  })}
                </p>
              )}
            </>
          )}
        </section>

        <div className="mt-4 d-flex flex-column gap-2">
          {token ? (
            <>
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <Link
                  to={addNewHref}
                  className="btn btn-sm fw-semibold"
                  style={{
                    background: 'linear-gradient(135deg, #3d7a4f 0%, #2d5c3c 100%)',
                    color: '#f0fff4',
                    border: '1px solid rgba(120, 200, 140, 0.5)',
                  }}
                >
                  {t('discover.addToCollection')}
                </Link>
                {Number.isFinite(Number(sp.id)) && (
                  <button
                    type="button"
                    className={`btn btn-sm fw-semibold ${watched ? 'btn-warning' : 'btn-outline-warning'}`}
                    disabled={watchBusy}
                    onClick={async () => {
                      setWatchBusy(true)
                      setWatchMessage('')
                      try {
                        if (watched) {
                          await speciesWatchService.unwatch(sp.id)
                          setWatched(false)
                          setWatchMessage(t('discover.notifyMeRemoved'))
                        } else {
                          await speciesWatchService.watch(sp.id)
                          setWatched(true)
                          setWatchMessage(t('discover.notifyMeAdded'))
                        }
                      } catch {
                        setWatchMessage(t('discover.notifyMeError'))
                      } finally {
                        setWatchBusy(false)
                      }
                    }}
                  >
                    {watched ? `🔔 ${t('discover.notifyMeOn')}` : `🔔 ${t('discover.notifyMe')}`}
                  </button>
                )}
              </div>
              {watchMessage && (
                <p className="small mb-0" style={{ color: 'var(--ta-text-muted)' }}>{watchMessage}</p>
              )}
              {!watchMessage && (
                <p className="small mb-0" style={{ color: 'var(--ta-text-muted)' }}>
                  {t('discover.notifyMeHint')}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="small mb-0" style={{ color: 'var(--ta-text-muted)' }}>
                {t('discover.loginToAddHint')}
              </p>
              <Link
                to="/login"
                state={{ redirectAfterAuth: addNewHref }}
                className="btn btn-sm fw-semibold align-self-start"
                style={{
                  border: '1px solid var(--ta-gold)',
                  color: 'var(--ta-gold)',
                  background: 'transparent',
                }}
              >
                {t('discover.loginOrRegisterToAdd')}
              </Link>
            </>
          )}
        </div>

        {hasPro && (
          <div className="mt-3">
            <Link
              to={`/discover/compare?a=${sp.id}`}
              className="btn btn-sm"
              style={{ border: '1px solid var(--ta-gold)', color: 'var(--ta-gold)', background: 'transparent' }}
            >
              {t('discover.comparePickSecond')}
            </Link>
          </div>
        )}
        {!hasPro && (
          <p className="small mt-3 mb-0" style={{ color: 'var(--ta-text-muted)' }}>
            {t('discover.compareProTeaser')}{' '}
            <Link to="/pro" style={{ color: 'var(--ta-gold)' }}>
              Pro
            </Link>
            {t('discover.compareProTeaserEnd')}
          </p>
        )}
      </div>
    </PublicShell>
  )
}
