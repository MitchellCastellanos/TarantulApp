import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import marketplaceService from '../services/marketplaceService'
import moderationService from '../services/moderationService'
import { imgUrl } from '../services/api'

export default function KeeperProfilePage() {
  const { sellerUserId } = useParams()
  const { t } = useTranslation()
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [reviews, setReviews] = useState([])
  const [msg, setMsg] = useState('')

  const load = async () => {
    const [p, r] = await Promise.all([
      marketplaceService.getKeeperPublic(sellerUserId),
      marketplaceService.getKeeperReviews(sellerUserId),
    ])
    setData(p)
    setReviews(Array.isArray(r) ? r : [])
  }

  useEffect(() => {
    load().catch(() => setMsg(t('public.notFound')))
  }, [sellerUserId])

  const reportKeeper = async () => {
    const reason = window.prompt(t('marketplace.reportReason'))
    if (!reason || !reason.trim()) return
    await moderationService.reportKeeperProfile(sellerUserId, { reason: reason.trim(), details: '' })
    setMsg(t('marketplace.reportSent'))
  }

  if (!data) {
    return (
      <div>
        <Navbar />
        <div className="container mt-4 text-muted">{t('common.loading')}</div>
      </div>
    )
  }

  const profile = data.profile || {}
  const badges = Array.isArray(data.badges) ? data.badges : []
  const badgesProgress = data.badgesProgress || {}
  const reputation = data.reputation || null
  const sameUser = user && String(user.id) === String(sellerUserId)

  return (
    <div>
      <Navbar />
      <div className="container mt-4" style={{ maxWidth: 920 }}>
        {msg && <div className="alert alert-info small py-2">{msg}</div>}
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body">
            <div className="d-flex align-items-center gap-2 mb-1">
              <img src={imgUrl(profile.profilePhoto) || '/spider-default.png'} alt="keeper" style={{ width: 48, height: 48, borderRadius: 999, objectFit: 'cover' }} />
              <h4 className="mb-0">{data.displayName}</h4>
            </div>
            <p className="small text-muted mb-2">
              @{profile.handle || 'keeper'} · {profile.location || '-'}
            </p>
            <p className="mb-2">{profile.bio || t('marketplace.noBio')}</p>
            {badges.length > 0 && (
              <div className="d-flex gap-1 flex-wrap mb-2">
                {badges.map((b) => (
                  <span className="badge bg-light text-dark border" key={b.key || b.label}>{b.label}</span>
                ))}
              </div>
            )}
            <div className="small text-muted mb-2">
              {t('marketplace.rating')}: {data.ratingAvg || 0} ({data.reviewsCount || 0})
            </div>
            {reputation && (
              <div className="small mb-2">
                <strong>{t('marketplace.reputationTitle')}:</strong> {t('marketplace.reputationLine', { tier: reputation.tier, score: reputation.score })}
                <div className="progress mt-1" style={{ height: 8 }}>
                  <div className="progress-bar bg-warning" style={{ width: `${Math.min(100, Number(reputation.score || 0))}%` }} />
                </div>
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
                      <div className="small">{p?.nextLabel}</div>
                      <div className="progress" style={{ height: 6 }}>
                        <div className="progress-bar bg-info" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {!sameUser && (
              <button className="btn btn-sm btn-outline-secondary" onClick={reportKeeper}>
                {t('marketplace.report')}
              </button>
            )}
          </div>
        </div>

        <div className="row g-3">
          <div className="col-md-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h6>{t('marketplace.activeListings')}</h6>
                {(data.activeListings || []).length === 0 && (
                  <p className="small text-muted mb-0">{t('marketplace.empty')}</p>
                )}
                {(data.activeListings || []).map((l) => (
                  <div key={l.id} className="border rounded p-2 mb-2">
                    <div className="fw-semibold">{l.title}</div>
                    <div className="small text-muted">{l.speciesName || '-'}</div>
                    <div className="small">{l.priceAmount != null ? `${l.priceAmount} ${l.currency || ''}` : t('marketplace.priceOnRequest')}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-body">
                <h6>{t('marketplace.reviews')}</h6>
                {reviews.length === 0 && <p className="small text-muted mb-0">{t('marketplace.noReviews')}</p>}
                {reviews.map((r) => (
                  <div key={r.id} className="border rounded p-2 mb-2 small">
                    <div className="fw-semibold">{'★'.repeat(Math.max(1, Number(r.rating || 0)))} · {r.reviewerName}</div>
                    <div>{r.comment || '-'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
