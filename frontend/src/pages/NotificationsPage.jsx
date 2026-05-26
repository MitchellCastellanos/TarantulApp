import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import notificationsService, { notifyNotificationsUpdated } from '../services/notificationsService'
import { useAuth } from '../context/AuthContext'
import { usePageSeo } from '../hooks/usePageSeo'
import { localeForI18n } from '../utils/dateFormat'

function notificationCategoryLabel(type, t) {
  const k = String(type || '')
  if (
    k === 'SPOOD_RECEIVED' ||
    k === 'SPOOD_TARANTULA_RECEIVED' ||
    k === 'SPOOD_PHOTO_RECEIVED' ||
    k === 'POST_COMMENT'
  ) {
    return t('notificationsScreen.categoryCommunity')
  }
  if (k.startsWith('SEX_ID')) return t('notificationsScreen.categorySexId')
  if (k === 'SPECIES_LISTED_WISHLIST') return t('notificationsScreen.categoryWishlist')
  return t('notificationsScreen.categoryGeneral')
}

/** Resolved path for SPA navigation (+ query when useful). Legacy `/comunidad` is normalized. */
export function notificationTargetPath(n) {
  const rawData = n?.data
  const data =
    rawData && typeof rawData === 'object' && !Array.isArray(rawData) ? rawData : {}
  // Community is paused: post/spood notifications no longer have a destination.
  if (n.type === 'POST_COMMENT' || n.type === 'SPOOD_RECEIVED') {
    return '/'
  }
  let route = typeof data.route === 'string' ? data.route.trim() : ''
  if (!route && data.caseId != null) {
    route = `/sex-id/${encodeURIComponent(String(data.caseId))}`
  }
  if (!route) return '/'
  if (route === '/comunidad' || route === '/community') return '/'
  if (route.startsWith('/comunidad/') || route.startsWith('/community/')) return '/'
  return route
}

function formatRelativePast(iso, i18nLang) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  let diffSec = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diffSec < 0) diffSec = 0
  const rtf = new Intl.RelativeTimeFormat(localeForI18n(i18nLang), { numeric: 'auto' })
  const minute = 60
  const hour = minute * 60
  const day = hour * 24
  if (diffSec < 45) return rtf.format(-diffSec, 'second')
  if (diffSec < hour) return rtf.format(-Math.floor(diffSec / minute), 'minute')
  if (diffSec < day) return rtf.format(-Math.floor(diffSec / hour), 'hour')
  if (diffSec < day * 7) return rtf.format(-Math.floor(diffSec / day), 'day')
  if (diffSec < day * 30) return rtf.format(-Math.floor(diffSec / (day * 7)), 'week')
  if (diffSec < day * 365) return rtf.format(-Math.floor(diffSec / (day * 30)), 'month')
  return rtf.format(-Math.floor(diffSec / (day * 365)), 'year')
}

export default function NotificationsPage() {
  const { t, i18n } = useTranslation()
  const { token } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [markBusy, setMarkBusy] = useState(false)

  usePageSeo({
    title: t('notificationsScreen.seoTitle'),
    description: t('notificationsScreen.metaDescription'),
    noindex: true,
  })

  const load = useCallback(async () => {
    if (!token) return
    const data = await notificationsService.list(0, 40)
    setRows(data?.content || [])
  }, [token])

  useEffect(() => {
    if (!token) return
    setLoading(true)
    load()
      .catch(() => setError(t('notificationsScreen.loadError')))
      .finally(() => setLoading(false))
  }, [token, load, t])

  const handleOpen = async (n) => {
    const unread = !n.readAt
    if (unread && n.id) {
      try {
        await notificationsService.markRead(n.id)
        notifyNotificationsUpdated()
      } catch {
        /* seguimos igual: el usuario igual puede abrir la ruta */
      }
    }
    navigate(notificationTargetPath(n))
  }

  const handleMarkAll = async () => {
    setMarkBusy(true)
    try {
      await notificationsService.markAllRead()
      notifyNotificationsUpdated()
      await load()
    } catch {
      setError(t('notificationsScreen.markAllError'))
    } finally {
      setMarkBusy(false)
    }
  }

  return (
    <div>
      <Navbar />
      <div className="container py-3 ta-notifications-page" style={{ maxWidth: 640 }}>
        <header className="mb-3">
          <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
            <div>
              <h1 className="h4 mb-1">{t('notificationsScreen.pageTitle')}</h1>
              <p className="text-muted small mb-0">{t('notificationsScreen.hint')}</p>
            </div>
            <div className="d-flex flex-wrap gap-2 align-items-start">
              {token && (
                <Link to="/wishlist" className="btn btn-sm btn-outline-warning">
                  🔔 {t('wishlist.title')}
                </Link>
              )}
              {token && rows.length > 0 && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-light"
                  disabled={markBusy || rows.every((x) => x.readAt)}
                  onClick={() => handleMarkAll()}
                >
                  {markBusy ? `${t('nav.markAllRead')}…` : t('nav.markAllRead')}
                </button>
              )}
            </div>
          </div>
        </header>

        {error ? (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="text-muted small">{t('notificationsScreen.loading')}</p>
        ) : rows.length === 0 ? (
          <p className="text-muted small mb-0">{t('nav.notificationsEmpty')}</p>
        ) : (
          <ul className="list-unstyled mb-0 d-flex flex-column gap-2">
            {rows.map((n) => {
              const title = String(n.title || '').trim() || t('nav.notificationFallbackTitle')
              const body = String(n.body || '').trim()
              const unread = !n.readAt
              const when = formatRelativePast(n.createdAt, i18n.language)
              const category = notificationCategoryLabel(n.type, t)
              return (
                <li key={String(n.id)}>
                  <div className={`ta-notification-item${unread ? ' ta-notification-item--unread' : ''}`}>
                    <button
                      type="button"
                      className="btn btn-link text-start text-decoration-none w-100 ta-notification-item__btn"
                      onClick={() => handleOpen(n)}
                    >
                      <div className="min-w-0">
                        <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                          <span className="badge bg-secondary">{category}</span>
                          {when ? (
                            <span className="text-muted small" style={{ fontSize: '0.72rem' }}>
                              {when}
                            </span>
                          ) : null}
                          {!unread ? (
                            <span className="text-muted small">{t('notificationsScreen.readBadge')}</span>
                          ) : null}
                        </div>
                        <div className="fw-semibold ta-notification-item__title">{title}</div>
                        {body ? <div className="small text-muted mt-1">{body}</div> : null}
                        {(n.actorDisplayName || n.actorHandle) && (
                          <div className="small mt-1 ta-notification-item__actor">
                            {[n.actorDisplayName, n.actorHandle ? `@${n.actorHandle}` : '']
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        )}
                        <div className="small fw-semibold mt-2 ta-notification-item__cta">
                          {t('notificationsScreen.openCta')} →
                        </div>
                      </div>
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
