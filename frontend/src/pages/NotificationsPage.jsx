import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import ChitinCardFrame from '../components/ChitinCardFrame'
import notificationsService, { notifyNotificationsUpdated } from '../services/notificationsService'
import { useAuth } from '../context/AuthContext'
import { usePageSeo } from '../hooks/usePageSeo'
import { localeForI18n } from '../utils/dateFormat'

function notificationCategoryLabel(type, t) {
  const k = String(type || '')
  if (k === 'SPOOD_RECEIVED' || k === 'POST_COMMENT') return t('notificationsScreen.categoryCommunity')
  if (k.startsWith('SEX_ID')) return t('notificationsScreen.categorySexId')
  return t('notificationsScreen.categoryGeneral')
}

/** Resolved path for SPA navigation (+ query when useful). Legacy `/comunidad` is normalized. */
export function notificationTargetPath(n) {
  const rawData = n?.data
  const data =
    rawData && typeof rawData === 'object' && !Array.isArray(rawData) ? rawData : {}
  const postId = data.postId != null ? String(data.postId) : ''
  if (postId && (n.type === 'POST_COMMENT' || n.type === 'SPOOD_RECEIVED')) {
    const base = `/community/post/${encodeURIComponent(postId)}`
    return n.type === 'POST_COMMENT' ? `${base}?comments=1` : base
  }
  let route = typeof data.route === 'string' ? data.route.trim() : ''
  if (!route && data.caseId != null) {
    route = `/sex-id/${encodeURIComponent(String(data.caseId))}`
  }
  if (!route) return '/community'
  if (route === '/comunidad') return '/community'
  if (route.startsWith('/comunidad/')) return `/community${route.slice('/comunidad'.length)}`
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
    <div className="container py-4" style={{ maxWidth: 640 }}>
      <Navbar />
      <header className="mb-4">
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
          <div>
            <h1 className="h4 mb-1">{t('notificationsScreen.pageTitle')}</h1>
            <p className="text-muted small mb-0">{t('notificationsScreen.hint')}</p>
          </div>
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
      </header>

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-muted small">{t('notificationsScreen.loading')}</p>
      ) : rows.length === 0 ? (
        <ChitinCardFrame>
          <p className="text-muted small mb-0">{t('nav.notificationsEmpty')}</p>
        </ChitinCardFrame>
      ) : (
        <div className="d-flex flex-column gap-2">
          {rows.map((n) => {
            const title = String(n.title || '').trim() || t('nav.notificationFallbackTitle')
            const body = String(n.body || '').trim()
            const unread = !n.readAt
            const when = formatRelativePast(n.createdAt, i18n.language)
            const category = notificationCategoryLabel(n.type, t)
            return (
              <ChitinCardFrame key={String(n.id)}>
                <button
                  type="button"
                  className="btn btn-link text-start text-decoration-none p-3 w-100"
                  onClick={() => handleOpen(n)}
                >
                  <div className="d-flex gap-3 align-items-start">
                    <div
                      style={{
                        width: '0.52rem',
                        flexShrink: 0,
                        minHeight: 48,
                        borderRadius: 4,
                        background: unread ? 'var(--ta-gold, #e8c547)' : 'transparent',
                      }}
                      aria-hidden
                    />
                    <div className="flex-grow-1 min-w-0">
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
                      <div className="fw-semibold" style={{ color: 'var(--ta-parchment, #f5f2e9)' }}>
                        {title}
                      </div>
                      {body ? (
                        <div className="small text-muted mt-1">{body}</div>
                      ) : null}
                      {(n.actorDisplayName || n.actorHandle) && (
                        <div className="small mt-1" style={{ color: 'var(--ta-text-muted)' }}>
                          {[n.actorDisplayName, n.actorHandle ? `@${n.actorHandle}` : '']
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      )}
                      <div className="small fw-semibold mt-2" style={{ color: 'var(--ta-gold, #e8c547)' }}>
                        {t('notificationsScreen.openCta')} →
                      </div>
                    </div>
                  </div>
                </button>
              </ChitinCardFrame>
            )
          })}
        </div>
      )}
    </div>
  )
}
