import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PublicShell from '../components/PublicShell'
import BrandLogoMark from '../components/BrandLogoMark'
import speciesService from '../services/speciesService'
import { imgUrl } from '../services/api'
import { publicUrl } from '../utils/publicAssets.js'

const PAGE_SIZE = 24

export default function DiscoverCatalogBrowsePage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10) || 0)
  const hobbyWorld = (searchParams.get('hobbyWorld') || '').trim().toLowerCase()
  const habitatRaw = (searchParams.get('habitatType') || '').trim().toLowerCase()
  const experienceLevel = (searchParams.get('experienceLevel') || '').trim().toLowerCase()
  const growthRate = (searchParams.get('growthRate') || '').trim().toLowerCase()
  const query = (searchParams.get('q') || '').trim()
  const sizeMin = (searchParams.get('sizeMin') || '').trim()
  const sizeMax = (searchParams.get('sizeMax') || '').trim()
  const sort = (searchParams.get('sort') || 'scientificName').trim()
  const direction = (searchParams.get('direction') || 'asc').trim()
  const semi = searchParams.get('semi') === '1'
  const habitatType = habitatRaw

  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  const spiderPh = publicUrl('spider-default.png')

  const title = useMemo(() => {
    if (hobbyWorld === 'new_world') return t('discover.browseTitleNewWorld')
    if (hobbyWorld === 'old_world') return t('discover.browseTitleOldWorld')
    if (habitatType === 'terrestrial') return t('discover.browseTitleTerrestrial')
    if (habitatType === 'fossorial') return t('discover.browseTitleFossorial')
    if (habitatType === 'arboreal' && semi) return t('discover.browseTitleSemiArboreal')
    if (habitatType === 'arboreal') return t('discover.browseTitleArboreal')
    return t('discover.browseTitleAll')
  }, [hobbyWorld, habitatType, semi, t])

  const load = useCallback(() => {
    setError(false)
    speciesService
      .discoverCatalogPage({
        page,
        pageSize: PAGE_SIZE,
        ...(hobbyWorld ? { hobbyWorld } : {}),
        ...(habitatType ? { habitatType } : {}),
        ...(experienceLevel ? { experienceLevel } : {}),
        ...(growthRate ? { growthRate } : {}),
        ...(query ? { q: query } : {}),
        ...(sizeMin ? { sizeMin: Number(sizeMin) } : {}),
        ...(sizeMax ? { sizeMax: Number(sizeMax) } : {}),
        sort,
        direction,
      })
      .then(setData)
      .catch(() => {
        setData(null)
        setError(true)
      })
  }, [page, hobbyWorld, habitatType, experienceLevel, growthRate, query, sizeMin, sizeMax, sort, direction])

  useEffect(() => {
    load()
  }, [load])

  const setPage = (next) => {
    const nextParams = new URLSearchParams(searchParams)
    if (next <= 0) nextParams.delete('page')
    else nextParams.set('page', String(next))
    setSearchParams(nextParams, { replace: true })
  }

  const rows = Array.isArray(data?.content) ? data.content : []
  const totalPages = typeof data?.totalPages === 'number' ? Math.max(1, data.totalPages) : 1
  const currentPage = typeof data?.number === 'number' ? data.number : page

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value == null || value === '') next.delete(key)
    else next.set(key, String(value))
    next.delete('page')
    setSearchParams(next, { replace: true })
  }

  return (
    <PublicShell>
      <div className="mx-auto ta-premium-page">
        <div className="ta-premium-shell">
          <div className="d-flex justify-content-center mb-3" aria-hidden>
            <BrandLogoMark size={56} showIntro={false} />
          </div>
          <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
            <Link to="/discover" className="small fw-semibold text-decoration-none" style={{ color: 'var(--ta-gold)' }}>
              ← {t('discover.browseBack')}
            </Link>
          </div>
          <h1 className="h4 fw-bold mb-1 cinzel" style={{ color: 'var(--ta-parchment)' }}>{title}</h1>
          <p className="small mb-4" style={{ color: 'var(--ta-text-muted)' }}>{t('discover.browsePageTitle')}</p>

          <div className="card border-0 shadow-sm mb-3 ta-premium-pane">
            <div className="card-body p-3">
              <h2 className="h6 mb-2">{t('discover.filtersTitle')}</h2>
              <div className="d-flex flex-wrap gap-2">
                <input
                  className="form-control form-control-sm"
                  style={{ minWidth: 160, flex: '1 1 220px' }}
                  placeholder={t('discover.searchPlaceholder')}
                  value={query}
                  onChange={(e) => updateFilter('q', e.target.value)}
                />
                <select className="form-select form-select-sm" style={{ width: 'auto', minWidth: 140 }} value={experienceLevel} onChange={(e) => updateFilter('experienceLevel', e.target.value)}>
                  <option value="">{t('discover.filterAnyExperience')}</option>
                  <option value="beginner">{t('species.levelBeginner')}</option>
                  <option value="intermediate">{t('species.levelIntermediate')}</option>
                  <option value="advanced">{t('species.levelAdvanced')}</option>
                </select>
                <select className="form-select form-select-sm" style={{ width: 'auto', minWidth: 140 }} value={growthRate} onChange={(e) => updateFilter('growthRate', e.target.value)}>
                  <option value="">{t('discover.filterAnyGrowth')}</option>
                  <option value="slow">{t('species.growthSlow')}</option>
                  <option value="moderate">{t('species.growthModerate')}</option>
                  <option value="fast">{t('species.growthFast')}</option>
                </select>
                <input
                  className="form-control form-control-sm"
                  style={{ width: 100 }}
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder={t('discover.sizeMin')}
                  value={sizeMin}
                  onChange={(e) => updateFilter('sizeMin', e.target.value)}
                />
                <input
                  className="form-control form-control-sm"
                  style={{ width: 100 }}
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder={t('discover.sizeMax')}
                  value={sizeMax}
                  onChange={(e) => updateFilter('sizeMax', e.target.value)}
                />
                <select className="form-select form-select-sm" style={{ width: 'auto', minWidth: 130 }} value={sort} onChange={(e) => updateFilter('sort', e.target.value)}>
                  <option value="scientificName">{t('discover.sortScientific')}</option>
                  <option value="commonName">{t('discover.sortCommon')}</option>
                  <option value="experienceLevel">{t('discover.sortExperience')}</option>
                  <option value="habitatType">{t('discover.sortHabitat')}</option>
                </select>
                <select className="form-select form-select-sm" style={{ width: 'auto', minWidth: 100 }} value={direction} onChange={(e) => updateFilter('direction', e.target.value)}>
                  <option value="asc">{t('discover.sortAsc')}</option>
                  <option value="desc">{t('discover.sortDesc')}</option>
                </select>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-danger small">{t('discover.catalogLoadError')}</p>
          )}

          {!error && rows.length === 0 && data && (
            <p className="small" style={{ color: 'var(--ta-text-muted)' }}>{t('discover.browseEmpty')}</p>
          )}

          <div className="list-group list-group-flush rounded-3 border mb-3" style={{ borderColor: 'var(--ta-border)' }}>
            {rows.map((sp) => {
              const thumb = sp.referencePhotoUrl ? imgUrl(sp.referencePhotoUrl) : spiderPh
              return (
                <Link
                  key={sp.id}
                  to={`/discover/species/${sp.id}`}
                  className="list-group-item list-group-item-action d-flex align-items-center gap-3 py-3"
                  style={{ background: 'var(--ta-bg-card)', color: 'var(--ta-parchment)', borderColor: 'var(--ta-border)' }}
                >
                  <div className="rounded-2 overflow-hidden flex-shrink-0 border" style={{ width: 52, height: 52, borderColor: 'var(--ta-border)' }}>
                    <img src={thumb} alt="" className="w-100 h-100" style={{ objectFit: 'cover' }} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = spiderPh }} />
                  </div>
                  <div className="min-w-0 flex-grow-1">
                    <div className="fw-semibold text-break fst-italic">{sp.scientificName}</div>
                    {sp.commonName && <div className="small text-break" style={{ color: 'var(--ta-text-muted)' }}>{sp.commonName}</div>}
                  </div>
                  <span className="flex-shrink-0" style={{ color: 'var(--ta-gold)' }} aria-hidden>›</span>
                </Link>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-sm btn-outline-light"
                disabled={currentPage <= 0}
                onClick={() => setPage(currentPage - 1)}
              >
                {t('discover.browsePrev')}
              </button>
              <span className="small" style={{ color: 'var(--ta-text-muted)' }}>
                {t('discover.browsePageStatus', { current: currentPage + 1, total: totalPages })}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-outline-light"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setPage(currentPage + 1)}
              >
                {t('discover.browseNext')}
              </button>
            </div>
          )}
        </div>
      </div>
    </PublicShell>
  )
}
