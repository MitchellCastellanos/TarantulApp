import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import userPublicService, { normalizePublicHandle } from '../services/userPublicService'
import marketplaceService from '../services/marketplaceService'
import { imgUrl } from '../services/api'

const profileCache = new Map()
const keeperCache = new Map()
const inflightProfile = new Map()
const inflightKeeper = new Map()

async function fetchPublicProfile(handle) {
  if (!handle) return null
  if (profileCache.has(handle)) return profileCache.get(handle)
  if (inflightProfile.has(handle)) return inflightProfile.get(handle)
  const req = userPublicService.byHandle(handle)
    .then((row) => {
      profileCache.set(handle, row || null)
      return row || null
    })
    .catch(() => {
      profileCache.set(handle, null)
      return null
    })
    .finally(() => {
      inflightProfile.delete(handle)
    })
  inflightProfile.set(handle, req)
  return req
}

async function fetchKeeperPublic(userId) {
  if (!userId) return null
  if (keeperCache.has(userId)) return keeperCache.get(userId)
  if (inflightKeeper.has(userId)) return inflightKeeper.get(userId)
  const req = marketplaceService.getKeeperPublic(userId)
    .then((row) => {
      keeperCache.set(userId, row || null)
      return row || null
    })
    .catch(() => {
      keeperCache.set(userId, null)
      return null
    })
    .finally(() => {
      inflightKeeper.delete(userId)
    })
  inflightKeeper.set(userId, req)
  return req
}

export default function PublicKeeperHandle({
  handle,
  displayName,
  profilePhoto,
  className = '',
  linkClassName = 'text-decoration-none fw-semibold',
  fallbackLabel = 'keeper',
  showAt = true,
}) {
  const normalizedHandle = useMemo(() => normalizePublicHandle(handle || ''), [handle])
  const [loading, setLoading] = useState(false)
  const [publicProfile, setPublicProfile] = useState(null)
  const [keeperData, setKeeperData] = useState(null)

  const loadPreview = useCallback(async () => {
    if (!normalizedHandle || loading || publicProfile) return
    setLoading(true)
    try {
      const profile = await fetchPublicProfile(normalizedHandle)
      setPublicProfile(profile)
      if (profile?.id) {
        const keeper = await fetchKeeperPublic(profile.id)
        setKeeperData(keeper)
      }
    } finally {
      setLoading(false)
    }
  }, [normalizedHandle, loading, publicProfile])

  if (!normalizedHandle) {
    return <span className={className}>{displayName || fallbackLabel}</span>
  }

  const avatarUrl =
    imgUrl(publicProfile?.profilePhoto || profilePhoto) ||
    publicProfile?.profilePhoto ||
    '/spider-default.png'
  const badges = Array.isArray(keeperData?.badges)
    ? keeperData.badges
    : Array.isArray(publicProfile?.badges)
      ? publicProfile.badges
      : []
  const reputation = keeperData?.reputation || null
  const badgesProgress = keeperData?.badgesProgress || {}
  const visibleLabel = showAt ? `@${normalizedHandle}` : normalizedHandle
  const visibleDisplay = publicProfile?.displayName || displayName || fallbackLabel
  const location = publicProfile?.location || keeperData?.profile?.location || ''
  const bio = publicProfile?.bio || keeperData?.profile?.bio || ''

  return (
    <span
      className={`ta-keeper-hover-anchor ${className}`.trim()}
      onMouseEnter={loadPreview}
      onFocus={loadPreview}
    >
      <Link to={`/u/${encodeURIComponent(normalizedHandle)}`} className={linkClassName}>
        {visibleLabel}
      </Link>
      <span className="ta-keeper-hover-card">
        <div className="d-flex align-items-center gap-2 mb-2">
          <img src={avatarUrl} alt={visibleLabel} className="ta-keeper-hover-card__avatar" />
          <div className="min-w-0">
            <div className="fw-semibold text-truncate">{visibleDisplay}</div>
            <div className="small text-muted text-truncate">{visibleLabel}</div>
          </div>
        </div>
        {loading && <div className="small text-muted">Loading...</div>}
        {!loading && location && <div className="small text-muted mb-1">{location}</div>}
        {!loading && bio && <div className="small mb-1">{bio}</div>}
        {!loading && reputation && (
          <div className="small mb-1">
            <span className="fw-semibold">Keeper Reputation:</span>{' '}
            {reputation.tier} · {reputation.score}/100
            <div className="progress mt-1" style={{ height: 6 }}>
              <div className="progress-bar bg-warning" style={{ width: `${Math.min(100, Number(reputation.score || 0))}%` }} />
            </div>
          </div>
        )}
        {!loading && badges.length > 0 && (
          <div className="d-flex flex-wrap gap-1 mt-1">
            {badges.map((badge, idx) => (
              <span key={`${badge?.key || badge?.label || 'badge'}-${idx}`} className="badge bg-light text-dark border">
                {badge?.label || badge?.key || 'Badge'}
              </span>
            ))}
          </div>
        )}
        {!loading && Object.keys(badgesProgress).length > 0 && (
          <div className="mt-2">
            {Object.entries(badgesProgress).slice(0, 2).map(([key, p]) => {
              const target = Number(p?.target || 0)
              const current = Number(p?.current || 0)
              const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 100
              return (
                <div key={key} className="small mb-1">
                  <div className="text-truncate">{p?.nextLabel}</div>
                  <div className="progress" style={{ height: 4 }}>
                    <div className="progress-bar bg-info" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </span>
    </span>
  )
}
