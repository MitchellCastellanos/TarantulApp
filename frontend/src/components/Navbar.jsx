import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import DiscoverNavSearch from './DiscoverNavSearch'
import { APP_LANGS, LOGIN_LANG_LABELS } from '../constants/languages'
import { appLangBase } from '../utils/appLanguage'
import ThemeToggleButton from './ThemeToggleButton'
import BrandNavbarLogo from './BrandNavbarLogo'
import notificationsService from '../services/notificationsService'

function trialDaysLeft(trialEndsAt) {
  if (!trialEndsAt) return 0
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000))
}

/**
 * @param {{ variant?: 'app' | 'public', hideLoginLink?: boolean }} [props]
 */
export default function Navbar({ variant = 'app', hideLoginLink = false }) {
  const { token, user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifUnread, setNotifUnread] = useState(0)
  const [notifRows, setNotifRows] = useState([])
  const notifWrapRef = useRef(null)
  const plan = user?.plan || 'FREE'
  const isPro = plan === 'PRO'
  const inTrial = user?.inTrial === true
  const overFreeLimit = user?.overFreeLimit === true
  const days = trialDaysLeft(user?.trialEndsAt)
  const adminEmails = String(import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const isAdmin =
    user?.admin === true ||
    (user?.email && adminEmails.includes(String(user.email).toLowerCase()))

  const path = location.pathname
  const logoHome = !token ? '/login' : '/'
  const closeMobileMenu = () => setMobileMenuOpen(false)

  useEffect(() => {
    closeMobileMenu()
  }, [path])

  useEffect(() => {
    if (!token) {
      setNotifUnread(0)
      setNotifRows([])
      setNotifOpen(false)
      return
    }
    let cancelled = false
    const pull = async () => {
      try {
        const [count, page] = await Promise.all([
          notificationsService.unreadCount(),
          notificationsService.list(0, 8),
        ])
        if (!cancelled) {
          setNotifUnread(Number(count || 0))
          setNotifRows(page?.content || [])
        }
      } catch {
        if (!cancelled) {
          setNotifUnread(0)
          setNotifRows([])
        }
      }
    }
    pull()
    const timer = setInterval(pull, 30000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [token])

  useEffect(() => {
    const onDocClick = (event) => {
      if (!notifWrapRef.current) return
      if (!notifWrapRef.current.contains(event.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const openNotifications = async () => {
    const next = !notifOpen
    setNotifOpen(next)
    if (!next) return
    try {
      const page = await notificationsService.list(0, 8)
      setNotifRows(page?.content || [])
      setNotifUnread(Number(page?.unreadCount || 0))
    } catch {
      // noop
    }
  }

  const markOneRead = async (id) => {
    try {
      await notificationsService.markRead(id)
      setNotifRows((rows) => rows.map((r) => (r.id === id ? { ...r, readAt: new Date().toISOString() } : r)))
      setNotifUnread((n) => Math.max(0, n - 1))
    } catch {
      // noop
    }
  }

  const routeFromNotification = (n) => {
    const route = typeof n?.data?.route === 'string' ? n.data.route.trim() : ''
    if (route.startsWith('/')) return route
    const type = String(n?.type || '').toUpperCase()
    if (type === 'SEX_ID_VOTE' && n?.data?.caseId) return `/sex-id/${n.data.caseId}`
    if (type === 'SPOOD_RECEIVED' || type === 'POST_COMMENT') return '/comunidad'
    return '/account'
  }

  const openNotification = async (n) => {
    if (!n?.id) return
    await markOneRead(n.id)
    setNotifOpen(false)
    navigate(routeFromNotification(n))
  }

  const markAllRead = async () => {
    try {
      await notificationsService.markAllRead()
      setNotifRows((rows) => rows.map((r) => ({ ...r, readAt: r.readAt || new Date().toISOString() })))
      setNotifUnread(0)
    } catch {
      // noop
    }
  }

  const linkTone = (active) =>
    variant === 'public'
      ? active
        ? 'var(--ta-gold)'
        : 'var(--ta-text-muted)'
      : 'var(--ta-gold)'
  const pillStyle = (active) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap',
    padding: '0.32rem 0.7rem',
    borderRadius: 999,
    border: `1px solid ${active ? 'var(--ta-gold)' : 'var(--ta-border)'}`,
    color: active ? '#111' : 'var(--ta-parchment)',
    background: active ? 'var(--ta-gold)' : 'transparent',
    fontSize: '0.78rem',
    fontWeight: 600,
    textDecoration: 'none',
  })
  const menuPillStyle = (active) => ({
    ...pillStyle(active),
    padding: '0.42rem 0.82rem',
  })

  const planControl = (() => {
    if (!token) {
      return (
        <Link
          to="/pro"
          className="btn btn-sm"
          style={{
            background: 'transparent',
            color: 'var(--ta-gold)',
            border: '1px solid var(--ta-gold)',
            fontSize: '0.75rem',
          }}
        >
          {t('nav.planFreeDiscover')}
        </Link>
      )
    }
    if (!user) {
      return (
        <Link
          to="/pro"
          className="btn btn-sm"
          style={{
            background: 'transparent',
            color: 'var(--ta-gold)',
            border: '1px solid var(--ta-gold)',
            fontSize: '0.75rem',
          }}
        >
          {t('nav.planFreeDiscover')}
        </Link>
      )
    }
    if (!isPro && !inTrial && overFreeLimit) {
      return (
        <Link
          to="/pro"
          className="btn btn-sm"
          style={{
            background: 'rgba(180, 120, 30, 0.35)',
            color: '#ffd89a',
            border: '1px solid rgba(220, 170, 80, 0.5)',
            fontSize: '0.72rem',
            maxWidth: 220,
          }}
          title={t('nav.badgeOverLimitTitle')}
        >
          {t('nav.badgeOverLimit')}
        </Link>
      )
    }
    if (isPro) {
      return (
        <Link
          to="/pro"
          className="btn btn-sm"
          style={{
            background: 'var(--ta-gold)',
            color: '#111',
            border: '1px solid var(--ta-gold)',
            fontSize: '0.75rem',
          }}
        >
          {t('nav.planPro')}
        </Link>
      )
    }
    if (inTrial) {
      return (
        <Link
          to="/pro"
          className="btn btn-sm fw-semibold"
          style={{
            background: 'linear-gradient(135deg, #e8c56a 0%, #c9a227 100%)',
            color: '#1a1205',
            border: '1px solid rgba(200, 160, 40, 0.9)',
            fontSize: '0.72rem',
            boxShadow: '0 0 12px rgba(200, 170, 60, 0.35)',
          }}
          title={t('nav.trialBadgeTitle')}
        >
          {t('nav.trialBadge', { days })}
        </Link>
      )
    }
    return (
      <Link
        to="/pro"
        className="btn btn-sm"
        style={{
          background: 'transparent',
          color: 'var(--ta-gold)',
          border: '1px solid var(--ta-gold)',
          fontSize: '0.75rem',
        }}
      >
        {t('nav.planFreeDiscover')}
      </Link>
    )
  })()

  return (
    <nav
      className="navbar navbar-dark px-3 px-md-4 py-2"
      style={{
        overflow: 'visible',
        ...(variant === 'public'
          ? { borderBottom: '1px solid var(--ta-border, rgba(200,170,100,0.25))' }
          : {}),
      }}
    >
      <BrandNavbarLogo key={path} homeTo={logoHome} showIntro />
      <div className="d-md-none ms-auto d-flex align-items-center gap-2">
        {token && (
          <Link
            to="/"
            onClick={closeMobileMenu}
            className="btn btn-sm fw-semibold ta-mobile-collection-cta"
            style={{
              fontSize: '0.78rem',
            }}
          >
            {t('discover.myCollection', 'Mi colección')}
          </Link>
        )}
        <button
          type="button"
          className="btn btn-sm ta-mobile-menu-toggle"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? t('nav.close', 'Cerrar menú') : t('nav.open', 'Abrir menú')}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>
      <div
        className={`d-md-none w-100 mt-2 p-2 rounded-3 ta-mobile-nav-panel ${mobileMenuOpen ? 'is-open' : ''}`}
        aria-hidden={!mobileMenuOpen}
      >
          <div className="small fw-semibold mb-1 ta-mobile-nav-section-title">
            Explorar
          </div>
          <div className="d-flex flex-wrap gap-2 pb-1">
            <Link onClick={closeMobileMenu} to="/descubrir" style={menuPillStyle(path.startsWith('/descubrir'))} title={t('nav.discoverLinkTitle')}>
              {t('discover.navTitle')}
            </Link>
            <Link onClick={closeMobileMenu} to="/marketplace" style={menuPillStyle(path.startsWith('/marketplace'))} title={t('marketplace.title')}>
              {t('marketplace.nav')}
            </Link>
            <Link
              onClick={closeMobileMenu}
              to={token ? '/comunidad' : '/login'}
              state={token ? undefined : { redirectAfterAuth: '/comunidad' }}
              style={menuPillStyle(path.startsWith('/comunidad'))}
              title={t('social.navTitle')}
            >
              {t('nav.community')}
            </Link>
            <Link onClick={closeMobileMenu} to="/about" style={menuPillStyle(path.startsWith('/about'))} title={t('nav.aboutTitle')}>
              {t('nav.about')}
            </Link>
          </div>

          {token && (
            <>
              <div className="small fw-semibold mb-1 mt-2 ta-mobile-nav-section-title">
                Mi espacio
              </div>
              <div className="d-flex flex-wrap gap-2 pb-1">
                <Link
                  to="/"
                  onClick={closeMobileMenu}
                  className="btn btn-sm fw-semibold ta-mobile-collection-cta"
                  style={{ fontSize: '0.8rem' }}
                >
                  {t('discover.myCollection', 'Mi colección')}
                </Link>
                <Link
                  onClick={closeMobileMenu}
                  to="/herramientas/qr"
                  style={menuPillStyle(path.startsWith('/herramientas/qr') || path.startsWith('/tarantulas/qr-print'))}
                  title={t('nav.qrToolTitle')}
                >
                  {t('nav.qrTool')}
                </Link>
                <Link onClick={closeMobileMenu} to="/reminders" style={menuPillStyle(path.startsWith('/reminders'))}>
                  {t('nav.reminders')}
                </Link>
                <Link onClick={closeMobileMenu} to="/account" style={menuPillStyle(path.startsWith('/account'))}>
                  {t('nav.account')}
                </Link>
                {user && isAdmin && (
                  <Link onClick={closeMobileMenu} to="/admin" style={menuPillStyle(path.startsWith('/admin'))}>
                    {t('nav.admin')}
                  </Link>
                )}
              </div>
            </>
          )}

          <div className="small fw-semibold mb-1 mt-2 ta-mobile-nav-section-title">
            Preferencias
          </div>
          <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
            <div>{planControl}</div>
            <div className="d-flex align-items-center gap-2">
                <div className="position-relative">
                  <Link onClick={closeMobileMenu} to="/account" className="btn btn-sm btn-outline-light">
                    🔔 {t('nav.notifications')}
                    {notifUnread > 0 ? ` (${notifUnread})` : ''}
                  </Link>
                </div>
              <div className="d-flex gap-1 align-items-center">
                {APP_LANGS.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    title={LOGIN_LANG_LABELS[l.code]}
                    aria-label={LOGIN_LANG_LABELS[l.code]}
                    onClick={() => i18n.changeLanguage(l.code)}
                    className="btn btn-sm px-1 py-0 border-0 d-inline-flex align-items-center"
                    style={{
                      background: 'transparent',
                      color: appLangBase(i18n.language) === l.code ? 'var(--ta-gold)' : 'var(--ta-text-muted)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      lineHeight: 1,
                      transition: 'color 0.15s',
                    }}
                  >
                    {l.display}
                  </button>
                ))}
              </div>
              <ThemeToggleButton compact />
              {token ? (
                <button
                  className="btn btn-sm btn-outline-light"
                  onClick={logout}
                  style={{ borderColor: 'var(--ta-border)', color: 'var(--ta-parchment)', fontSize: '0.8rem' }}
                >
                  {t('nav.logout')}
                </button>
              ) : hideLoginLink ? (
                <Link
                  to="/descubrir"
                  onClick={closeMobileMenu}
                  className="btn btn-sm"
                  style={{
                    border: '1px solid var(--ta-border)',
                    color: 'var(--ta-parchment)',
                    background: 'transparent',
                    fontSize: '0.8rem',
                  }}
                >
                  {t('nav.continueDiscover')}
                </Link>
              ) : (
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  className="btn btn-sm btn-outline-light"
                  style={{ borderColor: 'var(--ta-border)', color: 'var(--ta-parchment)', fontSize: '0.8rem' }}
                >
                  {t('nav.login', 'Login')}
                </Link>
              )}
            </div>
          </div>
      </div>
      <div className="d-none d-md-flex align-items-center gap-2 gap-md-3 flex-wrap justify-content-end flex-grow-1">
        {token && (
          <div
            className="d-none d-md-flex flex-grow-1 ms-md-2"
            style={{ maxWidth: 360, minWidth: 0, overflow: 'visible' }}
          >
            <DiscoverNavSearch className="w-100" />
          </div>
        )}
        <Link
          to="/descubrir"
          className="text-decoration-none small fw-semibold d-none d-md-inline"
          style={{ color: linkTone(path.startsWith('/descubrir')) }}
          title={t('nav.discoverLinkTitle')}
        >
          {t('discover.navTitle')}
        </Link>
        <Link
          to="/herramientas/qr"
          className="text-decoration-none small fw-semibold d-none d-md-inline"
          style={{ color: linkTone(path.startsWith('/herramientas/qr')) }}
          title={t('nav.qrToolTitle')}
        >
          {t('nav.qrTool')}
        </Link>
        <Link
          to="/marketplace"
          className="text-decoration-none small fw-semibold d-none d-md-inline"
          style={{ color: linkTone(path.startsWith('/marketplace')) }}
          title={t('marketplace.title')}
        >
          {t('marketplace.nav')}
        </Link>
        <Link
          to={token ? '/comunidad' : '/login'}
          state={token ? undefined : { redirectAfterAuth: '/comunidad' }}
          className="text-decoration-none small fw-semibold d-none d-md-inline"
          style={{ color: linkTone(path.startsWith('/comunidad')) }}
          title={t('social.navTitle')}
        >
          {t('nav.community')}
        </Link>
        <Link
          to="/about"
          className="text-decoration-none small fw-semibold d-none d-md-inline"
          style={{ color: linkTone(path.startsWith('/about')) }}
          title={t('nav.aboutTitle')}
        >
          {t('nav.about')}
        </Link>
        {token && (
          <Link
            to="/"
            className="btn btn-sm fw-semibold d-none d-md-inline-flex align-items-center"
            style={{
              background: 'var(--ta-gold)',
              color: '#111',
              border: '1px solid var(--ta-gold)',
              fontSize: '0.78rem',
            }}
          >
            {t('discover.myCollection', 'Mi colección')}
          </Link>
        )}
        {token && (
          <div className="position-relative d-none d-md-block" ref={notifWrapRef}>
            <button
              type="button"
              className="btn btn-sm btn-outline-light position-relative"
              onClick={openNotifications}
              style={{ borderColor: 'var(--ta-border)', color: 'var(--ta-parchment)', fontSize: '0.8rem' }}
            >
              🔔 {t('nav.notifications')}
              {notifUnread > 0 && (
                <span
                  className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                  style={{ fontSize: '0.62rem' }}
                >
                  {notifUnread > 99 ? '99+' : notifUnread}
                </span>
              )}
            </button>
            {notifOpen && (
              <div
                className="position-absolute end-0 mt-2 p-2 rounded-3 shadow"
                style={{ width: 320, zIndex: 1100, background: 'var(--ta-surface,#1b1a18)', border: '1px solid var(--ta-border)' }}
              >
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="small fw-semibold">{t('nav.notifications')}</div>
                  <button type="button" className="btn btn-sm btn-outline-secondary py-0 px-2" onClick={markAllRead}>
                    {t('nav.markAllRead')}
                  </button>
                </div>
                {notifRows.length === 0 ? (
                  <div className="small text-muted">{t('nav.notificationsEmpty')}</div>
                ) : (
                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {notifRows.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => openNotification(n)}
                        className="btn btn-sm text-start w-100 mb-1"
                        style={{
                          border: '1px solid var(--ta-border)',
                          background: n.readAt ? 'transparent' : 'rgba(200,170,80,0.12)',
                          color: 'var(--ta-parchment)',
                        }}
                      >
                        <div className="fw-semibold small">{n.title || t('nav.notificationFallbackTitle')}</div>
                        <div className="small text-muted">{n.body || ''}</div>
                        <div className="small text-muted mt-1">
                          {(n.type || '').replaceAll('_', ' ').toLowerCase()}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {token && (
          <Link to="/reminders" className="text-decoration-none d-none d-md-inline small fw-semibold"
                style={{ color: 'var(--ta-gold)' }}>
            ⏰ {t('nav.reminders')}
          </Link>
        )}
        {token && (
          <Link
            to="/account"
            className="d-none d-md-inline-flex align-items-center gap-1 text-decoration-none small fw-semibold"
            style={{
              color: 'var(--ta-parchment)',
              maxWidth: 'min(200px, 32vw)',
            }}
            title={t('nav.accountAria')}
            aria-label={t('nav.accountAria')}
          >
            <span className="text-truncate">
              {user?.displayName || user?.email || t('nav.account')}
            </span>
            <span className="flex-shrink-0" aria-hidden="true">
              ⚙️
            </span>
          </Link>
        )}
        {user && isAdmin && (
          <Link to="/admin" className="text-decoration-none small fw-semibold d-none d-md-inline" style={{ color: 'var(--ta-gold)' }}>
            {t('nav.admin')}
          </Link>
        )}
        <div className="d-none d-md-block">{planControl}</div>

        <div className="d-none d-md-flex gap-1 align-items-center">
          {APP_LANGS.map(l => (
            <button
              key={l.code}
              type="button"
              title={LOGIN_LANG_LABELS[l.code]}
              aria-label={LOGIN_LANG_LABELS[l.code]}
              onClick={() => i18n.changeLanguage(l.code)}
              className="btn btn-sm px-1 py-0 border-0 d-inline-flex align-items-center"
              style={{
                background: 'transparent',
                color: appLangBase(i18n.language) === l.code ? 'var(--ta-gold)' : 'var(--ta-text-muted)',
                fontSize: '0.72rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
                lineHeight: 1,
                transition: 'color 0.15s',
              }}>
              {l.display}
            </button>
          ))}
        </div>

        <div className="d-none d-md-block">
          <ThemeToggleButton compact />
        </div>

        <div className="d-none d-md-block">
          {token ? (
          <button className="btn btn-sm btn-outline-light" onClick={logout}
                  style={{ borderColor: 'var(--ta-border)', color: 'var(--ta-parchment)', fontSize: '0.8rem' }}>
            {t('nav.logout')}
          </button>
        ) : hideLoginLink ? (
          <Link
            to="/descubrir"
            className="btn btn-sm"
            style={{
              border: '1px solid var(--ta-border)',
              color: 'var(--ta-parchment)',
              background: 'transparent',
              fontSize: '0.8rem',
            }}
          >
            {t('nav.continueDiscover')}
          </Link>
        ) : (
          <Link to="/login" className="btn btn-sm btn-outline-light"
                style={{ borderColor: 'var(--ta-border)', color: 'var(--ta-parchment)', fontSize: '0.8rem' }}>
            {t('nav.login', 'Login')}
          </Link>
        )}
        </div>
      </div>
    </nav>
  )
}
