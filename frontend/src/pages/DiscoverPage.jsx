import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PublicShell from '../components/PublicShell'
import DiscoverSpeciesProfileSnippet from '../components/DiscoverSpeciesProfileSnippet'
import speciesService from '../services/speciesService'
import { imgUrl } from '../services/api'
import { fetchDiscoverTaxonomyHits } from '../utils/discoverTaxonomySearch'
import { useAuth } from '../context/AuthContext'

const DEBOUNCE_MS = 350

function gbifSpeciesUrl(key) {
  if (key == null || !Number.isFinite(Number(key))) return null
  return `https://www.gbif.org/species/${key}`
}

export default function DiscoverPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { token } = useAuth()
  const [qSearch, setQSearch] = useState('')
  const [hits, setHits] = useState([])
  const [searching, setSearching] = useState(false)

  const [selectedHit, setSelectedHit] = useState(null)
  const [panelLoading, setPanelLoading] = useState(false)
  /** 'sheet' | 'taxonomy_only' | 'taxonomy_partial' */
  const [panelKind, setPanelKind] = useState(null)
  const [speciesView, setSpeciesView] = useState(null)
  const [taxonPreview, setTaxonPreview] = useState(null)

  useEffect(() => {
    const taxon = searchParams.get('taxon')
    if (taxon != null && taxon !== '') {
      setQSearch(taxon)
    }
  }, [searchParams])

  useEffect(() => {
    if (!qSearch.trim()) {
      setHits([])
      return
    }
    const tmr = setTimeout(() => {
      setSearching(true)
      fetchDiscoverTaxonomyHits(qSearch.trim())
        .then(setHits)
        .catch(() => setHits([]))
        .finally(() => setSearching(false))
    }, DEBOUNCE_MS)
    return () => clearTimeout(tmr)
  }, [qSearch])

  const clearSelection = () => {
    setSelectedHit(null)
    setPanelKind(null)
    setSpeciesView(null)
    setTaxonPreview(null)
    setPanelLoading(false)
  }

  const openHit = async (hit) => {
    setSelectedHit(hit)
    setPanelLoading(true)
    setPanelKind(null)
    setSpeciesView(null)
    setTaxonPreview(null)
    const key = hit.gbifKey
    const keyNum = key != null ? Number(key) : NaN
    if (!Number.isFinite(keyNum)) {
      setPanelKind('taxonomy_partial')
      setTaxonPreview(null)
      setPanelLoading(false)
      return
    }
    try {
      const { speciesId } = await speciesService.getPublicSpeciesIdByGbif(keyNum)
      if (speciesId != null) {
        try {
          const view = await speciesService.getDiscoverSpeciesView(speciesId)
          setSpeciesView(view)
          setPanelKind('sheet')
          return
        } catch {
          /* seguir */
        }
      }
      try {
        const taxon = await speciesService.discoverTaxon(keyNum)
        setTaxonPreview(taxon)
        setPanelKind('taxonomy_only')
      } catch {
        setTaxonPreview(null)
        setPanelKind('taxonomy_partial')
      }
    } catch {
      setPanelKind('taxonomy_partial')
      setTaxonPreview(null)
    } finally {
      setPanelLoading(false)
    }
  }

  const addHref =
    selectedHit && panelKind === 'sheet' && speciesView?.species?.id
      ? `/tarantulas/new?speciesId=${speciesView.species.id}`
      : selectedHit && selectedHit.gbifKey
        ? `/tarantulas/new?gbifKey=${selectedHit.gbifKey}`
        : null

  const taxonomyTitle =
    taxonPreview?.canonicalName || taxonPreview?.scientificName || selectedHit?.canonicalName || '–'

  const taxonomySubtitle =
    panelKind === 'taxonomy_partial'
      ? t('discover.speciesProfileTaxonomyApology')
      : t('discover.speciesProfileTaxonomyShort', {
          source: selectedHit?.source === 'wsc' ? 'WSC' : 'GBIF',
        })

  return (
    <PublicShell>
      <div className="mx-auto" style={{ maxWidth: 720 }}>
        <h1 className="h3 fw-bold mb-2" style={{ color: 'var(--ta-parchment)' }}>
          {t('discover.title')}
        </h1>
        <p className="small text-muted mb-4">{t('discover.introTaxonomyOnly')}</p>

        <section className="mb-4">
          <h2 className="h6 text-uppercase letter-spacing mb-3" style={{ color: 'var(--ta-gold)' }}>
            {t('discover.sectionSearch')}
          </h2>
          <input
            type="search"
            className="form-control mb-2"
            placeholder={t('discover.searchPlaceholder')}
            value={qSearch}
            onChange={(e) => {
              const v = e.target.value
              setQSearch(v)
              clearSelection()
              if (searchParams.get('taxon')) {
                const next = new URLSearchParams(searchParams)
                next.delete('taxon')
                setSearchParams(next, { replace: true })
              }
            }}
            style={{ background: 'rgba(0,0,0,0.35)', borderColor: 'var(--ta-border)', color: 'var(--ta-parchment)' }}
          />
          {searching && <p className="small text-muted mb-2">{t('common.loading')}</p>}
          {!searching && hits.length === 0 && qSearch.trim() && (
            <p className="small text-muted">{t('discover.noSearchHits')}</p>
          )}
          <ul className="list-group list-group-flush border rounded overflow-hidden">
            {hits.map((h) => {
              const active = selectedHit && selectedHit.gbifKey === h.gbifKey && selectedHit.source === h.source
              return (
                <li
                  key={`${h.source}-${h.gbifKey}`}
                  className="list-group-item border-secondary-subtle bg-transparent"
                  style={active ? { borderLeft: '3px solid var(--ta-gold)', paddingLeft: '0.65rem' } : undefined}
                >
                  <button
                    type="button"
                    className="text-decoration-none d-flex justify-content-between align-items-center w-100 text-start border-0 bg-transparent px-0 py-1"
                    style={{ color: 'var(--ta-parchment)' }}
                    onClick={() => openHit(h)}
                  >
                    <span className="fw-semibold">{h.canonicalName}</span>
                    <span className="small text-muted ms-2 text-nowrap">
                      {h.source === 'wsc' ? 'WSC' : 'GBIF'}
                      {h.family ? ` · ${h.family}` : ''}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        {selectedHit && (
          <section className="mb-4">
            {panelLoading && <p className="small text-muted">{t('common.loading')}</p>}

            {!panelLoading && panelKind === 'sheet' && speciesView?.species && (
              <>
                <DiscoverSpeciesProfileSnippet species={speciesView.species} variant="discover" />
                <div className="d-flex flex-wrap gap-2 mt-3">
                  {gbifSpeciesUrl(selectedHit.gbifKey) && (
                    <a
                      href={gbifSpeciesUrl(selectedHit.gbifKey)}
                      className="btn btn-sm btn-outline-light"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t('discover.openGbifSpecies')}
                    </a>
                  )}
                  {addHref &&
                    (token ? (
                      <Link
                        to={addHref}
                        className="btn btn-sm fw-semibold"
                        style={{
                          background: 'linear-gradient(135deg, #3d7a4f 0%, #2d5c3c 100%)',
                          color: '#f0fff4',
                          border: '1px solid rgba(120, 200, 140, 0.5)',
                        }}
                      >
                        {t('discover.addToCollection')}
                      </Link>
                    ) : (
                      <Link
                        to="/login"
                        state={{ redirectAfterAuth: addHref }}
                        className="btn btn-sm fw-semibold"
                        style={{
                          border: '1px solid var(--ta-gold)',
                          color: 'var(--ta-gold)',
                          background: 'transparent',
                        }}
                      >
                        {t('discover.loginOrRegisterToAdd')}
                      </Link>
                    ))}
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={clearSelection}>
                    {t('discover.clearSelection')}
                  </button>
                </div>
              </>
            )}

            {!panelLoading && (panelKind === 'taxonomy_only' || panelKind === 'taxonomy_partial') && (
              <>
                <DiscoverSpeciesProfileSnippet title={taxonomyTitle} subtitle={taxonomySubtitle} variant="discover" />
                {taxonPreview?.photo?.url && (
                  <figure className="mt-2 mb-2">
                    <img
                      src={imgUrl(taxonPreview.photo.url)}
                      alt=""
                      className="img-fluid rounded border"
                      style={{ borderColor: 'var(--ta-border)', maxHeight: 200 }}
                    />
                    {taxonPreview.photo.attribution && (
                      <figcaption className="small mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        {taxonPreview.photo.attribution}
                      </figcaption>
                    )}
                  </figure>
                )}
                <div className="d-flex flex-wrap gap-2 mt-3">
                  {gbifSpeciesUrl(selectedHit.gbifKey) && (
                    <a
                      href={gbifSpeciesUrl(selectedHit.gbifKey)}
                      className="btn btn-sm btn-outline-light"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t('discover.openGbifSpecies')}
                    </a>
                  )}
                  {addHref &&
                    (token ? (
                      <Link
                        to={addHref}
                        className="btn btn-sm fw-semibold"
                        style={{
                          background: 'linear-gradient(135deg, #3d7a4f 0%, #2d5c3c 100%)',
                          color: '#f0fff4',
                          border: '1px solid rgba(120, 200, 140, 0.5)',
                        }}
                      >
                        {t('discover.addToCollection')}
                      </Link>
                    ) : (
                      <Link
                        to="/login"
                        state={{ redirectAfterAuth: addHref }}
                        className="btn btn-sm fw-semibold"
                        style={{
                          border: '1px solid var(--ta-gold)',
                          color: 'var(--ta-gold)',
                          background: 'transparent',
                        }}
                      >
                        {t('discover.loginOrRegisterToAdd')}
                      </Link>
                    ))}
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={clearSelection}>
                    {t('discover.clearSelection')}
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        <p className="small mt-4 mb-0" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {t('discover.dataDisclaimer')}
        </p>
      </div>
    </PublicShell>
  )
}
