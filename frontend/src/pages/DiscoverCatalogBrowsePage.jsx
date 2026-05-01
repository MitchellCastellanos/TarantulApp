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
      })
      .then(setData)
      .catch(() => {
        setData(null)
        setError(true)
      })
  }, [page, hobbyWorld, habitatType])

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
