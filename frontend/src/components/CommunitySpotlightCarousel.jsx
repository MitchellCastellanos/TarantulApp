import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import communityService from '../services/communityService'
import api, { imgUrl } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { publicUrl } from '../utils/publicAssets.js'

export default function CommunitySpotlightCarousel({ limit = 12, className = '' }) {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({
    queryKey: ['community', 'spotlight', limit],
    queryFn: () => communityService.spotlight(limit),
    staleTime: 60_000,
  })

  const items = Array.isArray(data?.items) ? data.items : []
  if (isLoading || items.length === 0) return null

  const placeholder = publicUrl('spider-default.png')

  return (
    <section className={`ta-community-spotlight ${className}`.trim()} aria-label={t('social.spotlightTitle')}>
      <h2 className="h6 fw-bold mb-1">{t('social.spotlightTitle')}</h2>
      <p className="small text-muted mb-2">{t('social.spotlightSubtitle')}</p>
      <div className="d-flex gap-3 overflow-auto pb-2 ta-community-spotlight-scroll">
        {items.map((item) => (
          <SpotlightStory key={item.tarantulaId || item.shortId} item={item} placeholder={placeholder} t={t} />
        ))}
      </div>
    </section>
  )
}

function SpotlightStory({ item, placeholder, t }) {
  const { user } = useAuth()
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [spoodCount, setSpoodCount] = useState(Number(item.spoodCount || 0))
  const [spoodedByViewer, setSpoodedByViewer] = useState(Boolean(item.spoodedByViewer))
  const [spoodBusy, setSpoodBusy] = useState(false)

  const photoSrc = imgUrl(item.photoUrl) || placeholder
  const spiderHref = item.shortId ? `/t/${item.shortId}` : null
  const keeperHref = item.keeperHandle ? `/u/${encodeURIComponent(item.keeperHandle)}` : null
  const canSpood = Boolean(item.shortId) && !item.viewerIsOwner

  const handleSpood = async (e) => {
    e?.stopPropagation?.()
    if (!canSpood || spoodBusy) return
    if (!user) {
      window.location.href = '/login'
      return
    }
    setSpoodBusy(true)
    try {
      const { data } = await api.post(`/public/t/${item.shortId}/spood`)
      setSpoodCount(Number(data?.spoodCount || 0))
      setSpoodedByViewer(Boolean(data?.spoodedByViewer))
    } catch {
      // no-op
    } finally {
      setSpoodBusy(false)
    }
  }

  const ring = (
    <button
      type="button"
      className="ta-spotlight-story-ring flex-shrink-0 border-0 bg-transparent p-0"
      onClick={() => setLightboxOpen(true)}
      aria-label={item.name ? `${item.name} — ${t('social.spotlightViewPhoto')}` : t('social.spotlightViewPhoto')}
    >
      <div className="ta-spotlight-story-inner">
        <img
          src={photoSrc}
          alt=""
          className="ta-spotlight-story-thumb"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null
            e.currentTarget.src = placeholder
          }}
        />
      </div>
    </button>
  )

  const label = (
    <div className="ta-spotlight-story-caption text-center mt-1" style={{ width: 76 }}>
      {spiderHref ? (
        <Link to={spiderHref} className="small fw-semibold text-truncate d-block text-dark text-decoration-none" title={item.name}>
          {item.name}
        </Link>
      ) : (
        <div className="small fw-semibold text-truncate" title={item.name}>{item.name}</div>
      )}
      {keeperHref ? (
        <Link to={keeperHref} className="small text-muted d-block text-truncate text-decoration-none">
          @{item.keeperHandle}
        </Link>
      ) : item.keeperHandle ? (
        <span className="small text-muted d-block text-truncate">@{item.keeperHandle}</span>
      ) : (
        <span className="small text-muted d-block text-truncate">{t('social.spotlightStoryFallback')}</span>
      )}
    </div>
  )

  return (
    <>
      <div className="flex-shrink-0">
        {ring}
        {label}
      </div>

      {lightboxOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center ta-spotlight-lightbox"
          style={{ background: 'rgba(0,0,0,0.88)', zIndex: 2100 }}
          role="dialog"
          aria-modal="true"
          aria-label={item.name || t('social.spotlightTitle')}
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="ta-spotlight-lightbox__panel text-center"
            style={{ maxWidth: '92vw', maxHeight: '92vh', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="btn btn-light btn-sm position-absolute top-0 end-0 m-2"
              style={{ zIndex: 2 }}
              onClick={() => setLightboxOpen(false)}
              aria-label={t('common.close')}
            >
              ✕ {t('common.close')}
            </button>
            <img
              src={photoSrc}
              alt={item.name || ''}
              style={{ maxWidth: '90vw', maxHeight: '72vh', objectFit: 'contain', borderRadius: 8 }}
            />
            <div className="text-white mt-3 px-2">
              <div className="fw-semibold">{item.name}</div>
              {item.speciesName ? <div className="small text-white-50">{item.speciesName}</div> : null}
              <div className="d-flex flex-wrap gap-2 justify-content-center align-items-center mt-3">
                {canSpood && (
                  <button
                    type="button"
                    className={`btn btn-sm ${spoodedByViewer ? 'btn-light' : 'btn-outline-light'}`}
                    disabled={spoodBusy}
                    onClick={handleSpood}
                    title={t('social.spoodLike')}
                  >
                    🕷️ {t('social.spoodCount', { count: spoodCount })}
                  </button>
                )}
                {spiderHref && (
                  <Link to={spiderHref} className="btn btn-sm btn-outline-light" onClick={() => setLightboxOpen(false)}>
                    {t('social.spotlightOpenSpecimen')}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
