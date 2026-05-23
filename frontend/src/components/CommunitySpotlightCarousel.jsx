import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import communityService from '../services/communityService'
import { imgUrl } from '../services/api'
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
  const spiderHref = item.shortId ? `/t/${item.shortId}` : null
  const photoSrc = imgUrl(item.photoUrl) || placeholder

  const ring = (
    <div className="ta-spotlight-story-ring flex-shrink-0">
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
  )

  const label = (
    <div className="ta-spotlight-story-caption text-center mt-1" style={{ width: 76 }}>
      <div className="small fw-semibold text-truncate" title={item.name}>{item.name}</div>
      {item.keeperHandle ? (
        <span className="small text-muted d-block text-truncate">@{item.keeperHandle}</span>
      ) : (
        <span className="small text-muted d-block text-truncate">{t('social.spotlightStoryFallback')}</span>
      )}
    </div>
  )

  if (spiderHref) {
    return (
      <Link to={spiderHref} className="ta-spotlight-story-link text-decoration-none text-dark flex-shrink-0">
        {ring}
        {label}
      </Link>
    )
  }

  return (
    <div className="flex-shrink-0">
      {ring}
      {label}
    </div>
  )
}
