import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PublicShell from '../components/PublicShell'
import BrandLogoMark from '../components/BrandLogoMark'
import OfficialPartnerShield from '../components/OfficialPartnerShield'
import DiscoverSpeciesProfileSnippet from '../components/DiscoverSpeciesProfileSnippet'
import ChitinCardFrame from '../components/ChitinCardFrame'
import SpeciesProfileCard from '../components/SpeciesProfileCard'
import FangPanel from '../components/FangPanel'
import speciesService from '../services/speciesService'
import { imgUrl } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { computeTerrariumRecommendation } from '../utils/terrariumEstimate'
import tarantulaService from '../services/tarantulaService'
import ProTrialCtaLink from '../components/ProTrialCtaLink'
import { usePageSeo } from '../hooks/usePageSeo'
import { useDiscoverSpeciesSuggestions } from '../hooks/useDiscoverSpeciesSuggestions'

const DEBOUNCE_MS = 300
const TARANTULA_FREE_LIMIT = 6

function DiscoverCollectionCtas({ addHref, token, user, collectionLoading, collectionCount, t }) {
  if (!addHref) return null
  const hasProFeatures = user?.hasProFeatures === true
  const isFreePlan = Boolean(token && user && !hasProFeatures)
  const atLimit = Boolean(
    isFreePlan && !collectionLoading && collectionCount != null && collectionCount >= TARANTULA_FREE_LIMIT
  )
  const waitingForCount = Boolean(isFreePlan && collectionLoading)

  const addBtnClass = 'btn btn-sm fw-semibold'
  const addBtnStyle = {
    background: 'linear-gradient(135deg, #3d7a4f 0%, #2d5c3c 100%)',
    color: '#f0fff4',
    border: '1px solid rgba(120, 200, 140, 0.5)',
  }

  if (!token) {
    return (
      <div className="d-flex flex-column gap-2 align-items-start">
        <p className="small mb-0" style={{ color: 'var(--ta-text)', maxWidth: 440 }}>
          {t('discover.addGuestCtaBody')}
        </p>
        <div className="d-flex flex-wrap gap-2">
          <Link to="/login" state={{ redirectAfterAuth: addHref }} className={addBtnClass} style={addBtnStyle}>
            {t('discover.addGuestSignIn')}
          </Link>
          <Link
            to="/login"
            state={{ redirectAfterAuth: addHref, initialMode: 'register' }}
            className="btn btn-sm fw-semibold"
            style={{
              border: '1px solid var(--ta-gold)',
              color: 'var(--ta-gold)',
              background: 'transparent',
            }}
          >
            {t('discover.addGuestCreateAccount')}
          </Link>
          <Link to="/login" state={{ redirectAfterAuth: '/' }} className="btn btn-sm btn-outline-light">
            {t('discover.addGuestViewCollection')}
          </Link>
        </div>
      </div>
    )
  }

  if (waitingForCount) {
    return (
      <button
        type="button"
        disabled
        className={addBtnClass}
        style={{ ...addBtnStyle, opacity: 0.55 }}
        aria-busy="true"
      >
        {t('discover.addToCollection')}…
      </button>
    )
  }

  if (atLimit) {
    return (
      <div className="d-flex flex-column gap-2 align-items-start">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <button
            type="button"
            disabled
            className={`${addBtnClass} disabled`}
            style={{ ...addBtnStyle, opacity: 0.45 }}
            title={t('discover.addLockedHint')}
          >
            <i className="bi bi-lock-fill me-1" aria-hidden="true" />
            {t('discover.addToCollection')}
          </button>
          <ProTrialCtaLink className="btn btn-sm align-self-center" />
        </div>
        <p className="small mb-0" style={{ color: 'var(--ta-text-muted)' }}>
          {t('discover.addLimitReached')}
        </p>
      </div>
    )
  }

  return (
    <Link to={addHref} className={addBtnClass} style={addBtnStyle}>
      {t('discover.addToCollection')}
    </Link>
  )
}

function gbifSpeciesUrl(key) {
  if (key == null || !Number.isFinite(Number(key))) return null
  return `https://www.gbif.org/species/${key}`
}

export default function DiscoverPage() {
  const { t, i18n } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { token, user } = useAuth()

  const [speciesQuery, setSpeciesQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const [selectedSpecies, setSelectedSpecies] = useState(null)
  const [selectedFallbackPhoto, setSelectedFallbackPhoto] = useState(null)
  const [panelKind, setPanelKind] = useState(null)
  const [taxonPreview, setTaxonPreview] = useState(null)
  const [panelLoading, setPanelLoading] = useState(false)
  /** GBIF usage key for links when a row was picked from WSC/GBIF */
  const [activeGbifKey, setActiveGbifKey] = useState(null)

  const [specimenSizeCm, setSpecimenSizeCm] = useState('')
  const [collectionCount, setCollectionCount] = useState(null)
  const [collectionLoading, setCollectionLoading] = useState(false)

  const {
    suggestions,
    gbifResults,
    wscResults,
    gbifLoading,
    wscLoading,
    searchBusy,
    exactLocalSpeciesHit,
    resetSuggestions,
  } = useDiscoverSpeciesSuggestions(speciesQuery, {
    pauseWhenQueryMatches: selectedSpecies?.scientificName ?? null,
    debounceMs: DEBOUNCE_MS,
  })

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const hubJsonLd = useMemo(() => {
    const url = origin ? `${origin}/descubrir` : '/descubrir'
    return {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: t('discover.seoHubTitle'),
      description: t('discover.seoHubDescription'),
      url,
      inLanguage: i18n.language,
      isPartOf: {
        '@type': 'WebSite',
        name: 'TarantulApp',
        url: origin || undefined,
      },
    }
  }, [t, i18n.language, origin])

  usePageSeo({
    title: t('discover.seoHubTitle'),
    description: t('discover.seoHubDescription'),
    imageUrl: origin ? `${origin}/icon-512.png` : undefined,
    canonicalHref: origin ? `${origin}/descubrir` : undefined,
    jsonLd: hubJsonLd,
    jsonLdId: 'discover-hub-jsonld',
  })

  useEffect(() => {
    const taxon = searchParams.get('taxon')
    if (taxon != null && taxon !== '') {
      setSpeciesQuery(taxon)
      if (taxon.trim().length >= 2) setShowDropdown(true)
    }
  }, [searchParams])

  useEffect(() => {
    if (!token) {
      setCollectionCount(null)
      setCollectionLoading(false)
      return
    }
    setCollectionLoading(true)
    let cancelled = false
    tarantulaService
      .getAll()
      .then((items) => {
        if (!cancelled) {
          setCollectionCount(Array.isArray(items) ? items.length : 0)
          setCollectionLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCollectionCount(null)
          setCollectionLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const clearSelection = () => {
    resetSuggestions()
    setSelectedSpecies(null)
    setSelectedFallbackPhoto(null)
    setPanelKind(null)
    setTaxonPreview(null)
    setActiveGbifKey(null)
    setSpecimenSizeCm('')
    setPanelLoading(false)
    setSpeciesQuery('')
    setShowDropdown(false)
  }

  const clearSpeciesOnly = () => {
    resetSuggestions()
    setSelectedSpecies(null)
    setSelectedFallbackPhoto(null)
    setPanelKind(null)
    setTaxonPreview(null)
    setActiveGbifKey(null)
    setSpecimenSizeCm('')
    setSpeciesQuery('')
    setShowDropdown(false)
  }

  const selectLocalSpecies = async (sp) => {
    resetSuggestions()
    setSpeciesQuery(sp.scientificName || '')
    setShowDropdown(false)
    setTaxonPreview(null)
    setPanelKind(null)
    setSelectedFallbackPhoto(null)
    setActiveGbifKey(sp.gbifUsageKey != null ? Number(sp.gbifUsageKey) : null)
    setPanelLoading(true)
    try {
      const view = await speciesService.getDiscoverSpeciesView(sp.id)
      if (view?.species) {
        setSelectedSpecies(view.species)
        setSelectedFallbackPhoto(view.fallbackPhoto || null)
      } else {
        setSelectedSpecies(sp)
        setSelectedFallbackPhoto(null)
      }
      setPanelKind('full')
    } catch {
      setSelectedSpecies(sp)
      setSelectedFallbackPhoto(null)
      setPanelKind('full')
    } finally {
      setPanelLoading(false)
    }
  }

  const resolveFromGbifKey = useCallback(async (keyNum) => {
    setPanelLoading(true)
    setSelectedSpecies(null)
    setSelectedFallbackPhoto(null)
    setTaxonPreview(null)
    setPanelKind(null)
    setActiveGbifKey(keyNum)
    try {
      const { speciesId } = await speciesService.getPublicSpeciesIdByGbif(keyNum)
      if (speciesId != null) {
        try {
          const view = await speciesService.getDiscoverSpeciesView(speciesId)
          if (view?.species) {
            setSelectedSpecies(view.species)
            setSelectedFallbackPhoto(view.fallbackPhoto || null)
            setSpeciesQuery(view.species.scientificName || '')
            setPanelKind('full')
            return
          }
        } catch {
          /* taxonomy fallback */
        }
      }
      const taxon = await speciesService.discoverTaxon(keyNum)
      setTaxonPreview(taxon)
      setSpeciesQuery(taxon?.canonicalName || taxon?.scientificName || '')
      setPanelKind('taxonomy')
    } catch {
      setTaxonPreview(null)
      setPanelKind('taxonomy')
    } finally {
      setPanelLoading(false)
    }
  }, [])

  useEffect(() => {
    const sidRaw = searchParams.get('speciesId')
    const gkRaw = searchParams.get('gbifKey')
    if (!sidRaw && !gkRaw) return
    const sid = sidRaw != null && sidRaw !== '' ? Number(sidRaw) : NaN
    const gk = gkRaw != null && gkRaw !== '' ? Number(gkRaw) : NaN
    let cancelled = false

    const stripDeepLinkParams = () => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('speciesId')
          next.delete('gbifKey')
          next.delete('taxon')
          return next
        },
        { replace: true }
      )
    }

    ;(async () => {
      if (Number.isFinite(sid)) {
        resetSuggestions()
        setShowDropdown(false)
        setTaxonPreview(null)
        setPanelKind(null)
        setSelectedSpecies(null)
        setSelectedFallbackPhoto(null)
        setActiveGbifKey(null)
        setSpecimenSizeCm('')
        setPanelLoading(true)
        try {
          const view = await speciesService.getDiscoverSpeciesView(sid)
          if (cancelled) return
          if (view?.species) {
            setSelectedSpecies(view.species)
            setSelectedFallbackPhoto(view.fallbackPhoto || null)
            setSpeciesQuery(view.species.scientificName || '')
            setActiveGbifKey(
              view.species.gbifUsageKey != null ? Number(view.species.gbifUsageKey) : null
            )
            setPanelKind('full')
          }
        } catch {
          if (!cancelled) {
            setSelectedSpecies(null)
            setSelectedFallbackPhoto(null)
            setPanelKind(null)
          }
        } finally {
          if (!cancelled) setPanelLoading(false)
          if (!cancelled) stripDeepLinkParams()
        }
        return
      }
      if (Number.isFinite(gk)) {
        resetSuggestions()
        setShowDropdown(false)
        setSpecimenSizeCm('')
        try {
          await resolveFromGbifKey(gk)
        } finally {
          if (!cancelled) stripDeepLinkParams()
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [searchParams, resetSuggestions, resolveFromGbifKey, setSearchParams])

  const selectGbif = async (gr) => {
    resetSuggestions()
    const name = gr.canonicalName || gr.scientificName || ''
    setSpeciesQuery(name)
    setShowDropdown(false)
    await resolveFromGbifKey(Number(gr.key))
  }

  const selectWsc = async (wr) => {
    const key = wr.taxonId != null ? Number(String(wr.taxonId).trim()) : NaN
    if (!Number.isFinite(key)) return
    resetSuggestions()
    setSpeciesQuery(wr.name || '')
    setShowDropdown(false)
    await resolveFromGbifKey(key)
  }

  const addHref =
    selectedSpecies?.id != null
      ? `/tarantulas/new?speciesId=${selectedSpecies.id}`
      : activeGbifKey != null
        ? `/tarantulas/new?gbifKey=${activeGbifKey}`
        : null

  const maxSpecimenCm = useMemo(() => {
    const raw = selectedSpecies?.adultSizeCmMax
    if (raw == null || raw === '') return null
    const n = Number(raw)
    if (!Number.isFinite(n) || n <= 0) return null
    return Math.round(n * 1.1 * 10) / 10
  }, [selectedSpecies])

  useEffect(() => {
    if (maxSpecimenCm == null || specimenSizeCm === '') return
    const n = Number(specimenSizeCm)
    if (!Number.isFinite(n) || n <= maxSpecimenCm) return
    setSpecimenSizeCm(String(maxSpecimenCm))
  }, [selectedSpecies?.id, maxSpecimenCm])

  const onSpecimenSizeChange = (e) => {
    const raw = e.target.value
    if (raw === '') {
      setSpecimenSizeCm('')
      return
    }
    const n = Number(raw)
    if (!Number.isFinite(n)) {
      setSpecimenSizeCm(raw)
      return
    }
    if (maxSpecimenCm != null && n > maxSpecimenCm) {
      setSpecimenSizeCm(String(maxSpecimenCm))
      return
    }
    setSpecimenSizeCm(raw)
  }

  const onSpecimenSizeBlur = () => {
    if (maxSpecimenCm == null || specimenSizeCm === '') return
    const n = Number(specimenSizeCm)
    if (!Number.isFinite(n) || n <= maxSpecimenCm) return
    setSpecimenSizeCm(String(maxSpecimenCm))
  }

  const taxonomyTitle =
    taxonPreview?.canonicalName || taxonPreview?.scientificName || speciesQuery.trim() || '–'

  const taxonomySubtitle =
    panelKind === 'taxonomy' && !taxonPreview
      ? t('discover.speciesProfileTaxonomyApology')
      : t('discover.speciesProfileTaxonomyShort', { source: 'GBIF' })

  const terrariumRec =
    panelKind === 'full' && selectedSpecies
      ? computeTerrariumRecommendation(specimenSizeCm, selectedSpecies)
      : null

  useEffect(() => {
    const gbifKey = activeGbifKey ?? selectedSpecies?.gbifUsageKey
    if (!selectedSpecies || !Number.isFinite(Number(gbifKey))) return
    if (selectedSpecies.referencePhotoUrl) return
    if (selectedFallbackPhoto?.url) return
    let cancelled = false
    speciesService
      .discoverTaxon(Number(gbifKey))
      .then((taxon) => {
        if (cancelled) return
        if (taxon?.photo?.url) {
          setSelectedFallbackPhoto(taxon.photo)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [selectedSpecies, selectedFallbackPhoto?.url, activeGbifKey])

  return (
    <PublicShell>
      <div className="mx-auto" style={{ maxWidth: 920 }}>
        <div className="d-flex justify-content-center mb-3" aria-hidden>
          <BrandLogoMark size={72} showIntro />
        </div>
        <h1 className="h3 fw-bold mb-2 text-center text-md-start" style={{ color: 'var(--ta-parchment)' }}>
          {t('discover.title')}
        </h1>
        <p className="small mb-3" style={{ color: 'var(--ta-text-muted)' }}>{t('discover.browseIntro')}</p>

        <div className="row g-3 mb-4 align-items-stretch">
          <div className="col-lg-7 d-flex">
        <section className="mb-0 flex-grow-1 w-100 card border-0 shadow-sm p-4 ta-species-dropdown-card h-100">
          <h2 className="h6 text-uppercase letter-spacing mb-3 ta-accent-heading">
            {t('discover.sectionSearch')}
          </h2>
          <div className="mb-0 position-relative ta-species-autocomplete-wrap">
            <label className="form-label small fw-semibold" style={{ color: 'var(--ta-parchment)' }}>
              {t('discover.speciesNameLabel')}
            </label>
            <div className="input-group">
              <input
                type="search"
                className="form-control"
                placeholder={t('discover.searchPlaceholder')}
                value={speciesQuery}
                onChange={(e) => {
                  const v = e.target.value
                  setSpeciesQuery(v)
                  setSelectedSpecies(null)
                  setSelectedFallbackPhoto(null)
                  setPanelKind(null)
                  setTaxonPreview(null)
                  setActiveGbifKey(null)
                  setSpecimenSizeCm('')
                  setShowDropdown(true)
                  if (searchParams.get('taxon')) {
                    const next = new URLSearchParams(searchParams)
                    next.delete('taxon')
                    setSearchParams(next, { replace: true })
                  }
                }}
                onFocus={() => speciesQuery.trim().length >= 2 && setShowDropdown(true)}
                autoComplete="off"
                style={{
                  background: 'rgba(0,0,0,0.35)',
                  borderColor: 'var(--ta-border)',
                  color: 'var(--ta-parchment)',
                }}
              />
              {(selectedSpecies || panelKind) && (
                <button type="button" className="btn btn-outline-secondary" onClick={clearSpeciesOnly}>
                  ✕
                </button>
              )}
            </div>

            {showDropdown &&
              (suggestions.length > 0 ||
                gbifResults.length > 0 ||
                wscResults.length > 0 ||
                gbifLoading ||
                wscLoading) && (
                <ul
                  className="list-group position-absolute w-100 shadow-sm"
                  style={{ zIndex: 1000, top: '100%', maxHeight: 360, overflowY: 'auto' }}
                >
                  {suggestions.map((sp) => (
                    <li
                      key={sp.id}
                      className="list-group-item list-group-item-action"
                      style={{ cursor: 'pointer', background: 'var(--ta-bg-card)', color: 'var(--ta-text)' }}
                      onMouseDown={() => selectLocalSpecies(sp)}
                    >
                      <span className="fw-semibold small">{sp.scientificName}</span>
                      {sp.commonName && <span className="text-muted small ms-2">· {sp.commonName}</span>}
                      <span className="badge ms-2" style={{ background: 'var(--ta-purple)', color: 'var(--ta-text)', fontSize: '0.65rem' }}>
                        {t('discover.badgeCatalog')}
                      </span>
                    </li>
                  ))}

                  {!exactLocalSpeciesHit && (wscResults.length > 0 || wscLoading) && (
                    <>
                      <li
                        className="list-group-item py-1 px-3"
                        style={{ background: 'var(--ta-bg-panel)', borderTop: '1px solid var(--ta-border)', cursor: 'default' }}
                      >
                        <span className="small fw-semibold" style={{ color: 'var(--ta-gold)' }}>
                          {wscLoading ? t('form.wscLoading') : t('form.wscLabel')}
                        </span>
                      </li>
                      {wscResults.slice(0, 6).map((wr) => (
                        <li
                          key={wr.taxonId ?? wr.name}
                          className="list-group-item list-group-item-action"
                          style={{ cursor: 'pointer', background: 'var(--ta-bg-card)', color: 'var(--ta-text)' }}
                          onMouseDown={() => selectWsc(wr)}
                        >
                          <span className="fw-semibold small">{wr.name}</span>
                          {wr.family && (
                            <span className="badge ms-2" style={{ background: 'var(--ta-purple)', color: 'var(--ta-text)', fontSize: '0.65rem' }}>
                              {wr.family}
                            </span>
                          )}
                          {wr.author && wr.year && (
                            <span className="text-muted small ms-2">
                              · {wr.author}, {wr.year}
                            </span>
                          )}
                        </li>
                      ))}
                    </>
                  )}

                  {!exactLocalSpeciesHit && (gbifResults.length > 0 || gbifLoading) && (
                    <>
                      <li
                        className="list-group-item py-1 px-3"
                        style={{ background: 'var(--ta-bg-panel)', borderTop: '1px solid var(--ta-border)', cursor: 'default' }}
                      >
                        <span className="small fw-semibold" style={{ color: 'var(--ta-gold)' }}>
                          {gbifLoading ? t('form.gbifLoading') : t('form.gbifLabel')}
                        </span>
                      </li>
                      {gbifResults.slice(0, 6).map((gr) => (
                        <li
                          key={gr.key}
                          className="list-group-item list-group-item-action"
                          style={{ cursor: 'pointer', background: 'var(--ta-bg-card)', color: 'var(--ta-text)' }}
                          onMouseDown={() => selectGbif(gr)}
                        >
                          <span className="fw-semibold small">{gr.canonicalName || gr.scientificName}</span>
                          {gr.vernacularName && <span className="text-muted small ms-2">· {gr.vernacularName}</span>}
                          {gr.family && (
                            <span className="badge bg-primary ms-2" style={{ fontSize: '0.65rem' }}>
                              {gr.family}
                            </span>
                          )}
                        </li>
                      ))}
                    </>
                  )}
                </ul>
              )}
          </div>

          {speciesQuery.trim().length >= 2 &&
            !searchBusy &&
            !showDropdown &&
            !selectedSpecies &&
            !panelLoading &&
            suggestions.length === 0 &&
            gbifResults.length === 0 &&
            wscResults.length === 0 && (
              <p className="small mt-2 mb-0" style={{ color: 'var(--ta-text-muted)' }}>{t('discover.noSearchHits')}</p>
            )}
        </section>
          </div>
          <div className="col-lg-5 d-flex">
            <section className="ta-discover-marketplace-hub w-100 rounded-3 border p-4 d-flex flex-column">
              <div className="d-flex align-items-start gap-2 mb-2">
                <OfficialPartnerShield idPrefix="discover-hub" width={36} height={40} />
                <h2 className="h6 text-uppercase letter-spacing mb-0 ta-accent-heading" style={{ lineHeight: 1.35 }}>
                  {t('discover.marketplaceHubTitle')}
                </h2>
              </div>
              <p className="small flex-grow-1 mb-2" style={{ color: 'var(--ta-text)', lineHeight: 1.55 }}>
                {t('discover.marketplaceHubBody')}
              </p>
              <p className="small mb-3" style={{ color: 'var(--ta-text-muted)', lineHeight: 1.5 }}>
                {t('discover.marketplaceHubOfficial')}
              </p>
              <Link
                to="/marketplace"
                className="btn btn-sm mt-auto align-self-start fw-semibold"
                style={{
                  border: '1px solid var(--ta-gold)',
                  color: 'var(--ta-gold)',
                  background: 'transparent',
                }}
              >
                {t('discover.marketplaceHubCta')}
              </Link>
            </section>
          </div>
        </div>

        {panelLoading && (
          <p className="small mb-3" style={{ color: 'var(--ta-text-muted)' }}>{t('common.loading')}</p>
        )}

        {selectedSpecies && panelKind === 'full' && !panelLoading && (
          <section className="mb-4">
            <DiscoverSpeciesProfileSnippet species={selectedSpecies} variant="discover" />
            {Number.isFinite(Number(selectedSpecies.id)) && (
              <Link
                to={`/descubrir/especie/${selectedSpecies.id}`}
                className="small d-inline-block mb-2"
                style={{ color: 'var(--ta-gold)' }}
              >
                {t('discover.openDedicatedSheet')}
              </Link>
            )}
            <ChitinCardFrame className="mb-4">
              <SpeciesProfileCard
                species={selectedSpecies}
                tarantula={{ profilePhoto: null }}
                fallbackPhoto={selectedFallbackPhoto}
                t={t}
              />
            </ChitinCardFrame>

            <FangPanel className="mb-4">
              <div className="card border-0 shadow-sm" style={{ background: 'rgba(8,10,22,0.5)' }}>
                <div className="card-body">
                  <div className="ta-section-header mb-2">
                    <span style={{ color: 'var(--ta-parchment)' }}>🏠 {t('terrarium.title')}</span>
                  </div>
                  <p className="small mb-2" style={{ color: 'var(--ta-text)' }}>
                    {t('discover.terrariumSizeHint')}
                  </p>
                  <div className="row g-2 align-items-end mb-3">
                    <div className="col-sm-4">
                      <label className="form-label small fw-semibold mb-1" style={{ color: 'var(--ta-parchment)' }}>
                        {t('discover.yourSpecimenCm')}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={maxSpecimenCm != null ? maxSpecimenCm : undefined}
                        step="0.1"
                        className="form-control form-control-sm"
                        value={specimenSizeCm}
                        onChange={onSpecimenSizeChange}
                        onBlur={onSpecimenSizeBlur}
                        style={{
                          background: 'rgba(0,0,0,0.35)',
                          borderColor: 'var(--ta-border)',
                          color: 'var(--ta-parchment)',
                        }}
                      />
                      {maxSpecimenCm != null && (
                        <p className="small mt-1 mb-0" style={{ color: 'var(--ta-text-muted)' }}>
                          {t('discover.specimenMaxHint', { max: maxSpecimenCm })}
                        </p>
                      )}
                    </div>
                  </div>
                  {terrariumRec && (
                    <>
                      <div className="fw-semibold small mb-2" style={{ color: 'var(--ta-parchment)' }}>
                        📐 {t(terrariumRec.enclosureI18n.key, terrariumRec.enclosureI18n.params)}
                      </div>
                      {terrariumRec.pct !== null && (
                        <div>
                          <div className="d-flex justify-content-between small mb-1" style={{ color: 'var(--ta-text-muted)' }}>
                            <span>{t('terrarium.growthToAdult')}</span>
                            <span>{terrariumRec.pct}%</span>
                          </div>
                          <div className="progress" style={{ height: 6 }}>
                            <div
                              className={`progress-bar ${terrariumRec.pct >= 80 ? 'bg-success' : terrariumRec.pct >= 50 ? 'bg-warning' : 'bg-info'}`}
                              style={{ width: `${Math.min(100, terrariumRec.pct)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <p className="mb-0 mt-2 small" style={{ color: 'var(--ta-text-muted)', fontSize: '0.7rem' }}>
                    {t('terrarium.estimatedNote')}
                  </p>
                </div>
              </div>
            </FangPanel>

            <div className="d-flex flex-wrap gap-2">
              {gbifSpeciesUrl(activeGbifKey ?? selectedSpecies?.gbifUsageKey) && (
                <a
                  href={gbifSpeciesUrl(activeGbifKey ?? selectedSpecies?.gbifUsageKey)}
                  className="btn btn-sm btn-outline-light"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('discover.openGbifSpecies')}
                </a>
              )}
              <DiscoverCollectionCtas
                addHref={addHref}
                token={token}
                user={user}
                collectionLoading={collectionLoading}
                collectionCount={collectionCount}
                t={t}
              />
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={clearSelection}>
                {t('discover.clearSelection')}
              </button>
            </div>
          </section>
        )}

        {!selectedSpecies && panelKind === 'taxonomy' && !panelLoading && (
          <section className="mb-4">
            <DiscoverSpeciesProfileSnippet title={taxonomyTitle} subtitle={taxonomySubtitle} variant="discover" />
            {Number.isFinite(activeGbifKey) && (
              <Link
                to={`/descubrir/taxon/${activeGbifKey}`}
                className="small d-inline-block mt-2 mb-2"
                style={{ color: 'var(--ta-gold)' }}
              >
                {t('discover.openDedicatedTaxon')}
              </Link>
            )}
            {taxonPreview?.photo?.url && (
              <figure className="mt-2 mb-2">
                <img
                  src={imgUrl(taxonPreview.photo.url)}
                  alt=""
                  className="img-fluid rounded border"
                  style={{ borderColor: 'var(--ta-border)', maxHeight: 200 }}
                />
                {taxonPreview.photo.attribution && (
                  <figcaption className="small mt-1" style={{ color: 'var(--ta-text-muted)' }}>
                    {taxonPreview.photo.attribution}
                  </figcaption>
                )}
              </figure>
            )}
            <div className="d-flex flex-wrap gap-2 mt-3">
              {gbifSpeciesUrl(activeGbifKey) && (
                <a
                  href={gbifSpeciesUrl(activeGbifKey)}
                  className="btn btn-sm btn-outline-light"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('discover.openGbifSpecies')}
                </a>
              )}
              <DiscoverCollectionCtas
                addHref={addHref}
                token={token}
                user={user}
                collectionLoading={collectionLoading}
                collectionCount={collectionCount}
                t={t}
              />
              <button type="button" className="btn btn-sm btn-outline-secondary" onClick={clearSelection}>
                {t('discover.clearSelection')}
              </button>
            </div>
          </section>
        )}

        <p className="small mt-4 mb-0" style={{ color: 'var(--ta-text-muted)', lineHeight: 1.45 }}>
          {t('discover.pageFooterDisclaimer')}
        </p>
      </div>
    </PublicShell>
  )
}
