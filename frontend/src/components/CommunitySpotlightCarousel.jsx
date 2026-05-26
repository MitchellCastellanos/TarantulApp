import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import communityService from '../services/communityService'
import { imgUrl } from '../services/api'
import { publicUrl } from '../utils/publicAssets.js'

const STORY_DURATION_MS = 4500

export default function CommunitySpotlightCarousel({ limit = 12, className = '' }) {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({
    queryKey: ['community', 'spotlight', limit],
    queryFn: () => communityService.spotlight(limit),
    staleTime: 60_000,
  })

  const items = Array.isArray(data?.items) ? data.items : []
  const [viewerIndex, setViewerIndex] = useState(null)

  const close = useCallback(() => setViewerIndex(null), [])
  const next = useCallback(() => {
    setViewerIndex((i) => (i == null || i >= items.length - 1 ? null : i + 1))
  }, [items.length])
  const prev = useCallback(() => {
    setViewerIndex((i) => (i == null ? null : Math.max(0, i - 1)))
  }, [])

  if (isLoading || items.length === 0) return null

  const placeholder = publicUrl('spider-default.png')

  return (
    <section className={`ta-community-spotlight ${className}`.trim()} aria-label={t('social.spotlightTitle')}>
      <h2 className="h6 fw-bold mb-1">{t('social.spotlightTitle')}</h2>
      <p className="small text-muted mb-2">{t('social.spotlightSubtitle')}</p>
      <div className="d-flex gap-2 overflow-auto pb-2 ta-community-spotlight-scroll">
        {items.map((item, i) => (
          <SpotlightThumb
            key={item.tarantulaId || item.shortId || i}
            item={item}
            placeholder={placeholder}
            onOpen={() => setViewerIndex(i)}
            t={t}
          />
        ))}
      </div>
      {viewerIndex != null && (
        <StoryViewer
          items={items}
          index={viewerIndex}
          placeholder={placeholder}
          onClose={close}
          onNext={next}
          onPrev={prev}
          t={t}
        />
      )}
    </section>
  )
}

function SpotlightThumb({ item, placeholder, onOpen, t }) {
  const photoSrc = imgUrl(item.photoUrl) || placeholder
  return (
    <button type="button" onClick={onOpen} className="ta-spotlight-story-link flex-shrink-0">
      <div className="ta-spotlight-story-ring">
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
      </div>
      <div className="ta-spotlight-story-caption text-center mt-1">
        <div className="small fw-semibold text-truncate" title={item.name}>{item.name}</div>
        {item.keeperHandle ? (
          <span className="small text-muted d-block text-truncate">@{item.keeperHandle}</span>
        ) : (
          <span className="small text-muted d-block text-truncate">{t('social.spotlightStoryFallback')}</span>
        )}
      </div>
    </button>
  )
}

function StoryViewer({ items, index, placeholder, onClose, onNext, onPrev, t }) {
  const item = items[index]
  const photoSrc = imgUrl(item.photoUrl) || placeholder
  const touchStartX = useRef(null)

  useEffect(() => {
    const timer = setTimeout(onNext, STORY_DURATION_MS)
    return () => clearTimeout(timer)
  }, [index, onNext])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') onNext()
      else if (e.key === 'ArrowLeft') onPrev()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose, onNext, onPrev])

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current
    if (dx > 40) onPrev()
    else if (dx < -40) onNext()
    touchStartX.current = null
  }

  return (
    <div className="ta-spotlight-viewer" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className="ta-spotlight-viewer__stage"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="ta-spotlight-viewer__progress">
          {items.map((_, i) => (
            <span key={i} className="ta-spotlight-viewer__bar">
              <span
                className={`ta-spotlight-viewer__bar-fill${i < index ? ' is-done' : ''}${i === index ? ' is-active' : ''}`}
                style={i === index ? { animationDuration: `${STORY_DURATION_MS}ms` } : undefined}
              />
            </span>
          ))}
        </div>

        <img
          src={photoSrc}
          alt=""
          className="ta-spotlight-viewer__img"
          onError={(e) => {
            e.currentTarget.onerror = null
            e.currentTarget.src = placeholder
          }}
        />

        <div className="ta-spotlight-viewer__caption">
          <div className="fw-bold">{item.name}</div>
          {item.keeperHandle ? (
            <span className="small opacity-75">@{item.keeperHandle}</span>
          ) : (
            <span className="small opacity-75">{t('social.spotlightStoryFallback')}</span>
          )}
          {item.speciesName ? <div className="small fst-italic opacity-75">{item.speciesName}</div> : null}
        </div>

        <button
          type="button"
          className="ta-spotlight-viewer__close"
          onClick={onClose}
          aria-label={t('common.close', 'Close')}
        >
          ×
        </button>
        <button
          type="button"
          className="ta-spotlight-viewer__zone ta-spotlight-viewer__zone--prev"
          onClick={onPrev}
          aria-label={t('common.previous', 'Previous')}
        />
        <button
          type="button"
          className="ta-spotlight-viewer__zone ta-spotlight-viewer__zone--next"
          onClick={onNext}
          aria-label={t('common.next', 'Next')}
        />
      </div>
    </div>
  )
}
