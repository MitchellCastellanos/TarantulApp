import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import speciesService from '../services/speciesService'
import { imgUrl } from '../services/api'
import { publicUrl } from '../utils/publicAssets.js'
import { DISCOVER_POPULAR_SCIENTIFIC_NAMES } from '../constants/discoverPopularSpecies'

const EXPLORE_TILES = [
  { key: 'nw', to: '/discover/catalog?hobbyWorld=new_world', titleKey: 'discover.exploreNewWorld', hintKey: 'discover.exploreNewWorldHint', emoji: '🌎' },
  { key: 'ow', to: '/discover/catalog?hobbyWorld=old_world', titleKey: 'discover.exploreOldWorld', hintKey: 'discover.exploreOldWorldHint', emoji: '🌍' },
  { key: 'ter', to: '/discover/catalog?habitatType=terrestrial', titleKey: 'discover.exploreTerrestrial', hintKey: 'discover.exploreTerrestrialHint', emoji: '⛰️' },
  { key: 'arb', to: '/discover/catalog?habitatType=arboreal', titleKey: 'discover.exploreArboreal', hintKey: 'discover.exploreArborealHint', emoji: '🌳' },
  { key: 'fos', to: '/discover/catalog?habitatType=fossorial', titleKey: 'discover.exploreFossorial', hintKey: 'discover.exploreFossorialHint', emoji: '🕳️' },
  { key: 'semi', to: '/discover/catalog?habitatType=arboreal&semi=1', titleKey: 'discover.exploreSemiArboreal', hintKey: 'discover.exploreSemiArborealHint', emoji: '🪵' },
]

export default function DiscoverHubSections() {
  const { t } = useTranslation()
  const [popular, setPopular] = useState([])
  const [catalogTotal, setCatalogTotal] = useState(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const rows = await Promise.all(
        DISCOVER_POPULAR_SCIENTIFIC_NAMES.map(async (name) => {
          try {
            const list = await speciesService.getDiscoverCatalog(name)
            if (!Array.isArray(list)) return null
            const needle = name.trim().toLowerCase()
            const exact = list.find((s) => (s.scientificName || '').trim().toLowerCase() === needle)
            return exact || list[0] || null
          } catch {
            return null
          }
        }),
      )
      if (!cancelled) setPopular(rows.filter(Boolean))
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    speciesService
      .discoverCatalogPage({ page: 0, pageSize: 1 })
      .then((p) => {
        if (typeof p?.totalElements === 'number' && Number.isFinite(p.totalElements)) {
          setCatalogTotal(p.totalElements)
        }
      })
      .catch(() => {})
  }, [])

  const spiderPh = publicUrl('spider-default.png')

  const bannerTitle = useMemo(() => {
    if (catalogTotal != null && catalogTotal > 0) {
      return t('discover.catalogBannerTitle', { count: catalogTotal })
    }
    return t('discover.catalogBannerTitleFallback')
  }, [catalogTotal, t])

  return (
    <div className="mb-4">
      <div className="d-flex justify-content-between align-items-end flex-wrap gap-2 mb-2">
        <h2 className="h6 text-uppercase letter-spacing mb-0 ta-accent-heading">{t('discover.popularSectionTitle')}</h2>
        <Link to="/discover/catalog" className="small fw-semibold text-decoration-none" style={{ color: 'var(--ta-purple)' }}>
          {t('discover.popularSeeAll')}
        </Link>
      </div>
      <div className="d-flex gap-3 pb-1 mb-4" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {popular.length === 0 ? (
          <p className="small mb-0" style={{ color: 'var(--ta-text-muted)' }}>{t('common.loading')}</p>
        ) : (
          popular.map((sp) => {
            const thumb = sp.referencePhotoUrl ? imgUrl(sp.referencePhotoUrl) : spiderPh
            const id = sp.id
            if (!id) return null
            return (
              <Link
                key={sp.id}
                to={`/discover/species/${id}`}
                className="text-decoration-none flex-shrink-0"
                style={{ width: 96 }}
              >
                <div
                  className="rounded-circle overflow-hidden mx-auto mb-2 border"
                  style={{ width: 72, height: 72, borderColor: 'var(--ta-border)' }}
                >
                  <img src={thumb} alt="" className="w-100 h-100" style={{ objectFit: 'cover' }} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = spiderPh }} />
                </div>
                <div className="small text-center text-break" style={{ color: 'var(--ta-parchment)', lineHeight: 1.25 }}>
                  <span className="fst-italic">{sp.scientificName}</span>
                </div>
                {sp.commonName && (
                  <div className="text-center text-break" style={{ color: 'var(--ta-text-muted)', fontSize: '0.65rem', lineHeight: 1.2 }}>
                    {sp.commonName}
                  </div>
                )}
              </Link>
            )
          })
        )}
      </div>

      <h2 className="h6 text-uppercase letter-spacing mb-3 ta-accent-heading">{t('discover.exploreSectionTitle')}</h2>
      <div className="row g-2 mb-4">
        {EXPLORE_TILES.map((tile) => (
          <div key={tile.key} className="col-6 col-md-4">
            <Link
              to={tile.to}
              className="d-block h-100 text-decoration-none rounded-3 border p-3 ta-premium-pane"
              style={{ borderColor: 'var(--ta-border)', minHeight: 92 }}
            >
              <div className="d-flex align-items-start gap-2">
                <span className="fs-4" aria-hidden>{tile.emoji}</span>
                <div className="min-w-0">
                  <div className="fw-semibold small mb-0" style={{ color: 'var(--ta-parchment)' }}>{t(tile.titleKey)}</div>
                  <div className="small mt-1 mb-0" style={{ color: 'var(--ta-text-muted)', lineHeight: 1.35 }}>{t(tile.hintKey)}</div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      <div
        className="rounded-3 p-3 d-flex gap-3 align-items-start position-relative overflow-hidden"
        style={{
          border: '1px solid rgba(212, 175, 55, 0.45)',
          background: 'linear-gradient(135deg, rgba(20, 16, 40, 0.95), rgba(8, 10, 22, 0.98))',
        }}
      >
        <span className="fs-3 flex-shrink-0" style={{ color: 'var(--ta-purple)' }} aria-hidden>🌐</span>
        <div className="min-w-0 flex-grow-1">
          <div className="fw-semibold mb-1" style={{ color: 'var(--ta-gold)', fontSize: '0.95rem' }}>{bannerTitle}</div>
          <p className="small mb-0" style={{ color: 'var(--ta-text)', lineHeight: 1.5 }}>{t('discover.catalogBannerBody')}</p>
        </div>
        <span className="flex-shrink-0 align-self-end rounded-circle d-flex align-items-center justify-content-center" style={{ width: 28, height: 28, background: 'var(--ta-purple)', color: '#fff', fontSize: '0.75rem' }} aria-hidden>✓</span>
      </div>
    </div>
  )
}
