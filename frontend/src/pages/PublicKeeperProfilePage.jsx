import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import userPublicService from '../services/userPublicService'
import marketplaceService from '../services/marketplaceService'
import moderationService from '../services/moderationService'
import { imgUrl } from '../services/api'
import { usePageSeo } from '../hooks/usePageSeo'
import { BRAND_WITH_TM } from '../constants/brand'
import { useAuth } from '../context/AuthContext'

export default function PublicKeeperProfilePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { handle } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState(null)
  const [keeperData, setKeeperData] = useState(null)
  const [notice, setNotice] = useState('')

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const profileUrl = useMemo(() => {
    const safeHandle = String(handle || '').trim()
    return safeHandle && origin ? `${origin}/u/${encodeURIComponent(safeHandle)}` : ''
  }, [handle, origin])

  usePageSeo({
    title: profile?.displayName
      ? `${profile.displayName} - @${profile.publicHandle || handle || 'keeper'} - ${BRAND_WITH_TM}`
      : `Keeper profile - ${BRAND_WITH_TM}`,
    description: profile?.bio || t('public.keeperSeoDescription', { brand: BRAND_WITH_TM }),
    imageUrl: origin ? `${origin}/logo-neon.png` : undefined,
    canonicalHref: profileUrl || undefined,
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setNotice('')
    setProfile(null)
    setKeeperData(null)
    userPublicService
      .byHandle(handle || '')
      .then(async (p) => {
        if (cancelled) return
        setProfile(p || null)
        if (p?.id) {
          const k = await marketplaceService.getKeeperPublic(p.id).catch(() => null)
          if (!cancelled) setKeeperData(k)
        }
      })
      .catch(() => {
        if (!cancelled) setError(t('public.keeperNotFound'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [handle, t])

  const kp = keeperData?.profile || {}
  const badges = Array.isArray(keeperData?.badges) ? keeperData.badges : []
  const badgesProgress = keeperData?.badgesProgress || {}
  const badgeText = (badge) => {
    const key = badge?.key
    if (!key) return badge?.label || ''
    return t(`marketplace.badges.${key}`, { defaultValue: badge?.label || key })
  }
  const progressText = (progress) => {
    const key = progress?.nextKey
    if (!key) return progress?.nextLabel || ''
    return t(`marketplace.badges.${key}`, { defaultValue: progress?.nextLabel || key })
  }
  const reputation = keeperData?.reputation || null
  const sexId = profile?.sexId || null
  const sameUser = user && profile?.id && String(user.id) === String(profile.id)

  const reportKeeper = async () => {
    if (!profile?.id) return
    const reason = window.prompt(t('marketplace.reportReason'))
    if (!reason || !reason.trim()) return
    try {
      await moderationService.reportKeeperProfile(profile.id, { reason: reason.trim(), details: '' })
      setNotice(t('marketplace.reportSent'))
    } catch {
      setNotice(t('public.reportError'))
    }
  }

  return (
    <div>
      <Navbar variant="public" />
      <div className="container mt-4 mb-5" style={{ maxWidth: 860 }}>
        {loading && <div className="text-muted small">{t('public.keeperLoading')}</div>}
        {!loading && error && <div className="alert alert-warning small py-2">{error}</div>}
        {!loading && notice && !error && <div className="alert alert-info small py-2">{notice}</div>}
        {!loading && !error && profile && (
          <>
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <div className="d-flex align-items-start gap-3 mb-2">
                  <img
                    src={imgUrl(profile.profilePhoto) || '/spider-default.png'}
                    alt={`@${profile.publicHandle || 'keeper'}`}
                    style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 999 }}
                  />
                  <div className="flex-grow-1 min-w-0">
                    <div className="fw-bold h5 mb-0">{keeperData?.displayName || profile.displayName || 'Keeper'}</div>
                    <div className="small text-muted">@{profile.publicHandle || kp.handle || 'keeper'}</div>
                    {(kp.location || profile.location) ? (
                      <p className="small text-muted mb-1 mt-1">{kp.location || profile.location}</p>
                    ) : null}
                    {kp.featuredCollection ? (
                      <p className="small mb-0" style={{ color: 'var(--ta-text-muted)' }}>
                        <span className="fw-semibold">{t('public.keeperFeatured')}: </span>
                        {kp.featuredCollection}
                      </p>
                    ) : null}
                  </div>
                </div>
                <p className="small mb-2" style={{ color: 'var(--ta-text)', whiteSpace: 'pre-wrap' }}>
                  {kp.bio || profile.bio || t('public.keeperNoBio')}
                </p>
                {badges.length > 0 && (
                  <div className="d-flex gap-1 flex-wrap mb-2">
                    {badges.map((b) => (
                      <span className="badge bg-light text-dark border" key={b.key || b.label}>
                        {badgeText(b)}
                      </span>
                    ))}
                  </div>
                )}
                <div className="small text-muted mb-2">
                  {t('marketplace.rating')}: {keeperData?.ratingAvg ?? 0} ({keeperData?.reviewsCount ?? 0})
                </div>
                {reputation && (
                  <div className="ta-keeper-reputation-strip mb-2">
                    <div className="small fw-semibold mb-1" style={{ color: 'var(--ta-text)' }}>
                      {t('marketplace.reputationTitle')} ·{' '}
                      {t('marketplace.reputationLine', { tier: reputation.tier, score: reputation.score })}
                    </div>
                    <div className="progress mt-1" style={{ height: 8 }}>
                      <div
                        className="progress-bar bg-warning"
                        style={{ width: `${Math.min(100, Number(reputation.score || 0))}%` }}
                      />
                    </div>
                    {reputation.nextTier !== 'Max' && (
                      <div className="small text-muted mt-1">
                        {t('marketplace.reputationNext', {
                          tier: reputation.nextTier,
                          target: reputation.nextTierTarget,
                        })}
                      </div>
                    )}
                  </div>
                )}
                {Object.keys(badgesProgress).length > 0 && (
                  <div className="row g-2 mb-2">
                    {Object.entries(badgesProgress).map(([key, p]) => {
                      const target = Number(p?.target || 0)
                      const current = Number(p?.current || 0)
                      const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 100
                      return (
                        <div className="col-md-6" key={key}>
                          <div className="small">{progressText(p)}</div>
                          <div className="progress" style={{ height: 6 }}>
                            <div className="progress-bar bg-info" style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {sexId && (
                  <div className="ta-sex-id-reputation-card mb-2">
                    <div className="ta-sex-id-reputation-card__title">{t('public.sexIdTitle')}</div>
                    <div className="d-flex flex-wrap gap-2 mb-1">
                      <span className="badge ta-sex-id-badge ta-sex-id-badge--primary">
                        {t('public.sexIdPoints', { points: Number(sexId.points || 0) })}
                      </span>
                      <span className="badge ta-sex-id-badge">
                        {t('public.sexIdAccuracy', { pct: Number(sexId.accuracyPct || 0) })}
                      </span>
                      <span className="badge ta-sex-id-badge">
                        {t(`public.sexIdLevel.${String(sexId.level || 'rookie')}`)}
                      </span>
                    </div>
                    <div className="small text-muted mb-1">
                      {t('public.sexIdVotesLine', {
                        totalVotes: Number(sexId.totalVotes || 0),
                        settledVotes: Number(sexId.settledVotes || 0),
                        correct: Number(sexId.correctResolvedVotes || 0),
                      })}
                    </div>
                    {Array.isArray(sexId.achievements) && sexId.achievements.length > 0 && (
                      <div className="d-flex gap-1 flex-wrap mt-2">
                        {sexId.achievements.map((a) => (
                          <span className="badge ta-sex-id-badge ta-sex-id-badge--achievement" key={a.key || a.labelKey}>
                            {t(`public.sexIdAchievement.${a.labelKey || a.key}`)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {!sameUser && user && (
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={reportKeeper}>
                    {t('marketplace.report')}
                  </button>
                )}
              </div>
            </div>

            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h2 className="h6 mb-3" style={{ color: 'var(--ta-gold)' }}>
                  {t('public.keeperCollectionTitle')}
                </h2>
                {keeperData?.collectionPublic !== true ? (
                  <p className="small text-muted mb-0">{t('public.keeperCollectionPrivate')}</p>
                ) : (keeperData?.publicCollection || []).length === 0 ? (
                  <p className="small text-muted mb-0">{t('public.keeperCollectionEmpty')}</p>
                ) : (
                  <div className="row g-2">
                    {(keeperData.publicCollection || []).map((tar) => (
                      <div key={tar.id} className="col-md-6">
                        <Link
                          to={`/t/${encodeURIComponent(tar.shortId)}`}
                          className="text-decoration-none"
                          style={{ color: 'inherit' }}
                        >
                          <div className="border rounded p-2 h-100 small d-flex align-items-center gap-2">
                            <img
                              src={imgUrl(tar.profilePhoto) || '/spider-default.png'}
                              alt={tar.name || 'specimen'}
                              style={{ width: 44, height: 44, borderRadius: 999, objectFit: 'cover' }}
                            />
                            <div className="min-w-0">
                              <div className="fw-semibold text-truncate">{tar.name || 'Specimen'}</div>
                              <div className="text-muted text-truncate">{tar.speciesName || '-'}</div>
                              <div className="small" style={{ color: 'var(--ta-gold-soft)' }}>
                                🕷️ {Number(tar.spoodCount || 0)}
                              </div>
                            </div>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
