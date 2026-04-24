import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PublicShell from '../components/PublicShell'
import speciesService from '../services/speciesService'
import { fetchDiscoverTaxonomyHits } from '../utils/discoverTaxonomySearch'
import DiscoverSpeciesProfileSnippet from '../components/DiscoverSpeciesProfileSnippet'
import { useAuth } from '../context/AuthContext'
import { usePageSeo } from '../hooks/usePageSeo'
import { BRAND_WITH_TM } from '../constants/brand'

export default function DiscoverComparePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const hasPro = user?.hasProFeatures === true

  const a = params.get('a')
  const b = params.get('b')
  const gbifA = params.get('gbifA')
  const gbifB = params.get('gbifB')

  const mode = useMemo(() => {
    if (gbifA && gbifB) return 'gbif'
    if (a && b) return 'local'
    if (gbifA && !gbifB) return 'gbifPick'
    if (a && !b) return 'localPick'
    return 'empty'
  }, [a, b, gbifA, gbifB])

  const [left, setLeft] = useState(null)
  const [right, setRight] = useState(null)
  const [pickQ, setPickQ] = useState('')
  const [pickHits, setPickHits] = useState([])
  const [pickCatalog, setPickCatalog] = useState([])
  const [loading, setLoading] = useState(true)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const compareJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: t('discover.seoCompareTitle'),
      description: t('discover.seoCompareDescription'),
      url: origin ? `${origin}/discover/compare` : '/discover/compare',
      inLanguage: i18n.language,
      isPartOf: {
        '@type': 'WebSite',
        name: BRAND_WITH_TM,
        url: origin || undefined,
      },
    }),
    [t, i18n.language, origin]
  )

  usePageSeo({
    title: t('discover.seoCompareTitle'),
    description: t('discover.seoCompareDescription'),
    imageUrl: origin ? `${origin}/icon-512.png` : undefined,
    canonicalHref: origin ? `${origin}/discover/compare` : undefined,
    jsonLd: compareJsonLd,
    jsonLdId: 'discover-compare-jsonld',
  })

  const loadPair = useCallback(async () => {
    if (!hasPro) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      if (mode === 'local') {
        const [v1, v2] = await Promise.all([
          speciesService.getDiscoverSpeciesView(Number(a)),
          speciesService.getDiscoverSpeciesView(Number(b)),
        ])
        setLeft({ type: 'local', data: v1 })
        setRight({ type: 'local', data: v2 })
      } else if (mode === 'gbif') {
        const [t1, t2] = await Promise.all([
          speciesService.discoverTaxon(Number(gbifA)),
          speciesService.discoverTaxon(Number(gbifB)),
        ])
        setLeft({ type: 'gbif', data: t1 })
        setRight({ type: 'gbif', data: t2 })
      } else if (mode === 'localPick') {
        const v1 = await speciesService.getDiscoverSpeciesView(Number(a))
        setLeft({ type: 'local', data: v1 })
        setRight(null)
      } else if (mode === 'gbifPick') {
        const t1 = await speciesService.discoverTaxon(Number(gbifA))
        setLeft({ type: 'gbif', data: t1 })
        setRight(null)
      } else {
        setLeft(null)
        setRight(null)
      }
    } catch {
      setLeft(null)
      setRight(null)
    } finally {
      setLoading(false)
    }
  }, [hasPro, mode, a, b, gbifA, gbifB])

  useEffect(() => {
    loadPair()
  }, [loadPair])

  useEffect(() => {
    if (mode !== 'gbifPick') {
      setPickHits([])
      return
    }
    if (!pickQ.trim()) {
      setPickHits([])
      return
    }
    const tmr = setTimeout(() => {
      fetchDiscoverTaxonomyHits(pickQ.trim()).then(setPickHits).catch(() => setPickHits([]))
    }, 300)
    return () => clearTimeout(tmr)
  }, [pickQ, mode])

  useEffect(() => {
    if (!hasPro || mode !== 'localPick' || !a) {
      setPickCatalog([])
      return
    }
    speciesService
      .getDiscoverCatalog()
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : []
        setPickCatalog(list.filter((sp) => String(sp.id) !== String(a)).slice(0, 48))
      })
      .catch(() => setPickCatalog([]))
  }, [hasPro, mode, a])

  if (!hasPro) {
    return (
      <PublicShell>
        <div className="mx-auto" style={{ maxWidth: 520 }}>
          <h1 className="h5 fw-bold mb-3" style={{ color: 'var(--ta-parchment)' }}>
            {t('discover.compareProTitle')}
          </h1>
          <p className="small text-muted mb-3">{t('discover.compareProBody')}</p>
          <Link to="/pro" className="btn btn-sm" style={{ border: '1px solid var(--ta-gold)', color: 'var(--ta-gold)' }}>
            {t('discover.compareSeePro')}
          </Link>
          <div className="mt-3">
            <Link to="/discover" className="small" style={{ color: 'var(--ta-brown-light)' }}>
              {t('discover.backToDiscover')}
            </Link>
          </div>
        </div>
      </PublicShell>
    )
  }

  if (mode === 'empty') {
    return (
      <PublicShell>
        <p className="text-muted small">{t('discover.compareNeedParams')}</p>
        <Link to="/discover">{t('discover.backToDiscover')}</Link>
      </PublicShell>
    )
  }

  const pickSecondGbif = (key) => {
    navigate(`/discover/compare?gbifA=${gbifA}&gbifB=${key}`)
  }

  const pickSecondLocal = (id) => {
    navigate(`/discover/compare?a=${a}&b=${id}`)
  }

  const renderLocal = (side) => {
    const v = side?.data
    if (!v?.species) return null
    const sp = v.species
    return (
      <div>
        <DiscoverSpeciesProfileSnippet species={sp} variant="discover" />
        <Link to={`/discover/species/${sp.id}`} className="small d-inline-block mt-2" style={{ color: 'var(--ta-gold)' }}>
          {t('discover.openSheet')}
        </Link>
      </div>
    )
  }

  const renderGbif = (side) => {
    const d = side?.data
    if (!d) return null
    return (
      <div>
        <DiscoverSpeciesProfileSnippet
          variant="discover"
          title={d.canonicalName || d.scientificName}
          subtitle={t('discover.speciesProfileTaxonomyShort', { source: 'GBIF' })}
        />
        <Link to={`/discover/taxon/${d.gbifKey}`} className="small d-inline-block mt-2" style={{ color: 'var(--ta-gold)' }}>
          {t('discover.openSheet')}
        </Link>
      </div>
    )
  }

  return (
    <PublicShell>
      <div className="mx-auto" style={{ maxWidth: 900 }}>
        <h1 className="h5 fw-bold mb-3" style={{ color: 'var(--ta-parchment)' }}>
          {t('discover.compareTitle')}
        </h1>

        {loading && <p className="small text-muted">{t('common.loading')}</p>}

        {!loading && mode === 'gbifPick' && left && (
          <div className="mb-4">
            <div className="row g-3 mb-3">
              <div className="col-12">{renderGbif(left)}</div>
            </div>
            <p className="small text-muted">{t('discover.comparePickPrompt')}</p>
            <input
              className="form-control form-control-sm mb-2"
              placeholder={t('discover.searchPlaceholder')}
              value={pickQ}
              onChange={(e) => setPickQ(e.target.value)}
              style={{ background: 'rgba(0,0,0,0.35)', borderColor: 'var(--ta-border)', color: 'var(--ta-parchment)' }}
            />
            <ul className="list-group list-group-flush border rounded">
              {pickHits.map((h) => (
                <li key={`${h.source}-${h.gbifKey}`} className="list-group-item bg-transparent small">
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-start text-decoration-none"
                    style={{ color: 'var(--ta-parchment)' }}
                    onClick={() => pickSecondGbif(h.gbifKey)}
                  >
                    {h.canonicalName}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!loading && mode === 'localPick' && left && (
          <div className="mb-4">
            <div className="row g-3 mb-3">
              <div className="col-12">{renderLocal(left)}</div>
            </div>
            <p className="small text-muted">{t('discover.comparePickLocalPrompt')}</p>
            <div className="d-flex flex-column gap-1" style={{ maxHeight: 280, overflowY: 'auto' }}>
              {pickCatalog.map((sp) => (
                <button
                  key={sp.id}
                  type="button"
                  className="btn btn-sm text-start"
                  style={{
                    border: '1px solid var(--ta-border)',
                    color: 'var(--ta-parchment)',
                    background: 'rgba(0,0,0,0.2)',
                  }}
                  onClick={() => pickSecondLocal(sp.id)}
                >
                  {sp.scientificName}
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && (mode === 'local' || mode === 'gbif') && (
          <div className="row g-4">
            {mode === 'local' ? (
              <>
                <div className="col-md-6">{renderLocal(left)}</div>
                <div className="col-md-6">{renderLocal(right)}</div>
              </>
            ) : (
              <>
                <div className="col-md-6">{renderGbif(left)}</div>
                <div className="col-md-6">{renderGbif(right)}</div>
              </>
            )}
          </div>
        )}

        <div className="mt-4">
          <Link to="/discover" className="small" style={{ color: 'var(--ta-brown-light)' }}>
            {t('discover.backToDiscover')}
          </Link>
        </div>
      </div>
    </PublicShell>
  )
}
