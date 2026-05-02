import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import { APP_LANGS, LOGIN_LANG_LABELS } from '../constants/languages'
import { appLangBase } from '../utils/appLanguage'
import ThemeToggleButton from './ThemeToggleButton'
import BrandNavbarLogo from './BrandNavbarLogo'
import './Navbar.css'
import notificationsService from '../services/notificationsService'

import { trialCalendarDaysRemaining } from '../utils/trialDaysLeft'
import { isInviteOnlyEnabled } from '../utils/inviteOnly'

/** Invite-only guests: show destination styling but block navigation. */
function NavDest({ lock, to, className, title, style, children, onClick }) {
  if (lock) {
    return (
      <span
        className={className}
        style={{ ...(style || {}), opacity: 0.55, cursor: 'not-allowed' }}
        title={title}
        aria-disabled="true"
      >
        {children}
      </span>
    )
  }
  return (
    <Link to={to} className={className} style={style} title={title} onClick={onClick}>
      {children}
    </Link>
  )
}

/**
 * @param {{ variant?: 'app' | 'public', hideLoginLink?: boolean }} [props]
 */
export default function Navbar({ variant: _variant = 'app', hideLoginLink = false }) {
  const { token, user, logout } = useAuth()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileOpenGroup, setMobileOpenGroup] = useState('app')
  const [notifUnread, setNotifUnread] = useState(0)
  const plan = user?.plan || 'FREE'
  const isPro = plan === 'PRO'
  const inTrial = user?.inTrial === true
  const overFreeLimit = user?.overFreeLimit === true
  const days = trialCalendarDaysRemaining(user?.trialEndsAt)
  const adminEmails = String(import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const isAdmin =
    user?.admin === true ||
    (user?.email && adminEmails.includes(String(user.email).toLowerCase()))

  const inviteOnlyNav = isInviteOnlyEnabled()
  const lockPublicNav = inviteOnlyNav && !token
  const path = location.pathname
  const navDiscover = path.startsWith('/descubrir')
  const navQr =
    path.startsWith('/herramientas/qr') || path.startsWith('/tarantulas/qr-print')
  const navMarketplace = path.startsWith('/marketplace')
  const navCollection = Boolean(token) && path === '/'
  const navInsights = Boolean(token) && path.startsWith('/insights')
  const navCommunity = path.startsWith('/community') || path.startsWith('/comunidad')
  const navNotifications = path.startsWith('/notifications')
  const navAdmin = path.startsWith('/admin')
  const logoHome = !token ? (inviteOnlyNav ? '/' : '/login') : '/'
  const myPublicProfilePath = useMemo(() => {
    if (!user) return '/account'
    const h = String(user.publicHandle || '').trim()
    if (h) return `/u/${encodeURIComponent(h)}`
    if (user.id != null && String(user.id).trim() !== '') {
      return `/marketplace/keeper/${String(user.id).trim()}`
    }
    return '/account'
  }, [user])
  const publicProfileNavActive = useMemo(() => {
    if (!user) return false
    const h = String(user.publicHandle || '').trim()
    if (h && path === `/u/${encodeURIComponent(h)}`) return true
    if (user.id != null && path.startsWith('/marketplace/keeper/')) {
      const seg = path.replace(/^\/marketplace\/keeper\//, '').split('/')[0]
      return seg === String(user.id).trim()
    }
    return false
  }, [path, user])
  const closeMobileMenu = () => setMobileMenuOpen(false)
  const isRouteActive = (routeMatchers) => routeMatchers.some((matcher) => path.startsWith(matcher))
  const mobileGroups = useMemo(() => {
    const groups = [
      {
        key: 'app',
        title: t('nav.mobileApp'),
        items: [
          {
            to: '/descubrir',
            label: t('nav.discoverSpecies'),
            title: t('nav.discoverLinkTitle'),
            routeMatchers: ['/descubrir'],
          },
          {
            to: '/',
            label: token
              ? t('discover.myCollection', 'My collection')
              : t('nav.myCollectionGuestCta'),
            title: token ? t('discover.myCollection', 'My collection') : t('nav.myCollectionGuestHint'),
            routeMatchers: ['/'],
            exact: true,
          },
          ...(token
            ? [
                {
                  to: '/insights',
                  label: t('nav.insights'),
                  title: t('nav.insightsTitle'),
                  routeMatchers: ['/insights'],
                },
              ]
            : []),
          {
            to: '/herramientas/qr',
            label: t('nav.qrTool'),
            title: t('nav.qrToolTitle'),
            routeMatchers: ['/herramientas/qr', '/tarantulas/qr-print'],
          },
          {
            to: '/marketplace',
            label: t('marketplace.nav'),
            title: t('marketplace.title'),
            routeMatchers: ['/marketplace'],
          },
          {
            to: '/community',
            label: t('nav.community'),
            title: t('social.navTitle'),
            routeMatchers: ['/community', '/comunidad'],
          },
        ],
      },
    ]
    return groups.filter((group) => !group.hidden)
  }, [t, token])
  const activeGroupKey =
    mobileGroups.find((group) =>
      group.items.some((item) =>
        item.exact ? path === item.to : isRouteActive(item.routeMatchers || [item.to]),
      ),
    )?.key || 'app'

  useEffect(() => {
    closeMobileMenu()
  }, [path])

  useEffect(() => {
    if (!mobileMenuOpen) return
    setMobileOpenGroup(activeGroupKey)
  }, [activeGroupKey, mobileMenuOpen])

  useEffect(() => {
    if (!token) {
      setNotifUnread(0)
      return
    }
    let cancelled = false
    const pull = async () => {
      try {
        const count = await notificationsService.unreadCount()
        if (!cancelled) {
          setNotifUnread(Number(count || 0))
        }
      } catch {
        if (!cancelled) {
          setNotifUnread(0)
        }
      }
    }
    pull()
    const timer = setInterval(pull, 30000)
    const onInvalidate = () => {
      pull()
    }
    window.addEventListener('ta-notifications-updated', onInvalidate)
    return () => {
      cancelled = true
      clearInterval(timer)
      window.removeEventListener('ta-notifications-updated', onInvalidate)
    }
  }, [token])

  const menuPillStyle = (active) => ({
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '0.58rem 0.72rem',
    borderRadius: 10,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderBottom: active ? '2px solid rgba(232, 197, 71, 0.62)' : undefined,
    color: 'rgba(248, 250, 252, 0.92)',
    background: 'rgba(0, 0, 0, 0.45)',
    fontSize: '0.82rem',
    fontWeight: active ? 700 : 600,
    textDecoration: active ? 'underline' : 'none',
    textDecorationColor: active ? 'rgba(232, 197, 71, 0.85)' : 'transparent',
    textUnderlineOffset: '0.28em',
    textDecorationThickness: '2px',
    lineHeight: 1.2,
  })
  const mobileSectionButtonStyle = (active) => ({
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    border: `1px solid ${active ? 'rgba(232, 197, 71, 0.35)' : 'var(--ta-border)'}`,
    borderBottom: active ? '2px solid rgba(232, 197, 71, 0.48)' : undefined,
    background: 'rgba(12, 12, 16, 0.72)',
    color: active ? 'var(--ta-parchment)' : 'var(--ta-heading-gold)',
    padding: '0.48rem 0.62rem',
    fontWeight: 600,
    letterSpacing: '0.02em',
    fontSize: '0.8rem',
    textAlign: 'left',
  })

  const planControl = (() => {
    if (!token) {
      if (lockPublicNav) {
        return (
          <span
            className="btn btn-sm"
            style={{
              background: 'transparent',
              color: 'var(--ta-gold)',
              border: '1px solid var(--ta-gold)',
              fontSize: '0.75rem',
              opacity: 0.55,
              cursor: 'not-allowed',
            }}
            title={t('nav.inviteOnlyNavLocked')}
          >
            {t('nav.planFreeDiscover')}
          </span>
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
            background: 'linear-gradient(180deg, var(--ta-gold-light) 0%, var(--ta-gold) 100%)',
            color: '#140c02',
            border: '1px solid rgba(90, 65, 18, 0.55)',
            fontSize: '0.75rem',
            fontWeight: 700,
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
            background: 'linear-gradient(135deg, #d4a84b 0%, #a8842e 100%)',
            color: '#140c02',
            border: '1px solid rgba(232, 197, 71, 0.5)',
            fontSize: '0.72rem',
            boxShadow: '0 4px 14px rgba(90, 65, 18, 0.42)',
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
    <nav className="navbar navbar-dark px-3 px-md-4 py-2" style={{ overflow: 'visible' }}>
      <BrandNavbarLogo key={path} homeTo={logoHome} showIntro disableLink={lockPublicNav} />
      <div className="d-md-none ms-auto d-flex align-items-center gap-2">
        <Link
          to={token ? myPublicProfilePath : '/login'}
          onClick={closeMobileMenu}
          className="btn btn-sm ta-mobile-icon-btn"
          aria-label={token ? t('nav.publicProfileAria') : t('nav.login', 'Login')}
          title={token ? t('nav.publicProfileTitle') : t('nav.login', 'Login')}
        >
          ◯
        </Link>
        <Link
          to={token ? '/account' : '/login'}
          onClick={closeMobileMenu}
          className="btn btn-sm ta-mobile-icon-btn"
          aria-label={t('nav.settingsOnlyAria')}
          title={t('nav.settingsOnlyTitle')}
        >
          ⚙
        </Link>
        <button
          type="button"
          className="btn btn-sm ta-mobile-menu-toggle"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? t('nav.close', 'Cerrar menú') : t('nav.open', 'Abrir menú')}
        >
          {mobileMenuOpen ? '✕' : '⋯'}
        </button>
      </div>
      <div
        className={`d-md-none w-100 mt-2 p-2 rounded-3 ta-mobile-nav-panel ${mobileMenuOpen ? 'is-open' : ''}`}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="d-flex flex-column gap-2">
          {mobileGroups.map((group) => {
            const groupIsActive = group.key === activeGroupKey
            const groupIsOpen = mobileOpenGroup === group.key
            return (
              <div key={group.key} className="ta-mobile-nav-group">
                <button
                  type="button"
                  className="ta-mobile-nav-group-toggle"
                  style={mobileSectionButtonStyle(groupIsActive)}
                  onClick={() => setMobileOpenGroup((prev) => (prev === group.key ? '' : group.key))}
                  aria-expanded={groupIsOpen}
                  aria-label={t('nav.mobileSectionToggleAria', { section: group.title })}
                >
                  <span>{group.title}</span>
                  <span className="ta-mobile-nav-group-caret" aria-hidden="true">
                    {groupIsOpen ? '▾' : '▸'}
                  </span>
                </button>
                {group.items.length > 0 && (
                  <div className={`ta-mobile-nav-sublist ${groupIsOpen ? 'is-open' : ''}`} aria-hidden={!groupIsOpen}>
                    {group.items.map((item) => {
                      const isActive = item.exact
                        ? path === item.to
                        : isRouteActive(item.routeMatchers || [item.to])
                      return (
                        <NavDest
                          key={item.to}
                          lock={lockPublicNav}
                          onClick={lockPublicNav ? undefined : closeMobileMenu}
                          to={item.to}
                          className={`ta-mobile-nav-subitem ${item.className || ''}`.trim()}
                          style={item.className ? { fontSize: '0.8rem' } : menuPillStyle(isActive)}
                          title={lockPublicNav ? t('nav.inviteOnlyNavLocked') : item.title}
                        >
                          <span className="ta-mobile-nav-subitem-dot" aria-hidden="true">
                            •
                          </span>
                          <span>{item.label}</span>
                        </NavDest>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="d-flex flex-column gap-2 mt-3">
          <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              {token ? (
                <Link
                  onClick={closeMobileMenu}
                  to="/account"
                  className="btn btn-sm btn-outline-light"
                  aria-label={t('nav.accountAria')}
                  title={t('nav.accountAria')}
                >
                  {t('nav.accountSettings')}
                </Link>
              ) : (
                <Link onClick={closeMobileMenu} to="/login" className="btn btn-sm btn-outline-light">
                  {t('nav.login', 'Login')}
                </Link>
              )}
              {user && isAdmin && (
                <Link onClick={closeMobileMenu} to="/admin" className="btn btn-sm btn-outline-light">
                  {t('nav.admin')}
                </Link>
              )}
            </div>
          </div>
          <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
            <div>{planControl}</div>
            <div className="d-flex align-items-center gap-2">
                <div className="position-relative">
                  <Link onClick={closeMobileMenu} to="/notifications" className="btn btn-sm btn-outline-light">
                    🔔 {t('nav.notifications')}
                    {notifUnread > 0 ? ` (${notifUnread > 99 ? '99+' : notifUnread})` : ''}
                  </Link>
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
      </div>
      <div className="d-none d-md-flex align-items-center gap-2 gap-md-3 flex-wrap justify-content-end flex-grow-1">
        <div className="d-none d-md-flex align-items-center gap-2 flex-wrap">
          <NavDest
            lock={lockPublicNav}
            to="/descubrir"
            className={`ta-navbar-primary-link text-decoration-none small fw-semibold d-none d-md-inline ${navDiscover ? 'ta-navbar-primary-link--active' : ''}`}
            title={lockPublicNav ? t('nav.inviteOnlyNavLocked') : t('nav.discoverLinkTitle')}
          >
            {t('nav.discoverSpecies')}
          </NavDest>
          <NavDest
            lock={lockPublicNav}
            to="/herramientas/qr"
            className={`ta-navbar-primary-link text-decoration-none small fw-semibold d-none d-md-inline ${navQr ? 'ta-navbar-primary-link--active' : ''}`}
            title={lockPublicNav ? t('nav.inviteOnlyNavLocked') : t('nav.qrToolTitle')}
          >
            {t('nav.qrTool')}
          </NavDest>
          <NavDest
            lock={lockPublicNav}
            to="/marketplace"
            className={`ta-navbar-primary-link text-decoration-none small fw-semibold d-none d-md-inline ${navMarketplace ? 'ta-navbar-primary-link--active' : ''}`}
            title={lockPublicNav ? t('nav.inviteOnlyNavLocked') : t('marketplace.title')}
          >
            {t('marketplace.nav')}
          </NavDest>
          <NavDest
            lock={lockPublicNav}
            to={token ? '/' : inviteOnlyNav ? '/' : '/login'}
            className={`ta-navbar-primary-link text-decoration-none small fw-semibold d-none d-md-inline ${navCollection ? 'ta-navbar-primary-link--active' : ''}`}
            title={
              lockPublicNav
                ? t('nav.inviteOnlyNavLocked')
                : token
                  ? t('discover.myCollection', 'My collection')
                  : t('nav.myCollectionGuestHint')
            }
          >
            {token ? t('discover.myCollection', 'My collection') : t('nav.myCollectionGuestCta')}
          </NavDest>
          {token && (
            <Link
              to="/insights"
              className={`ta-navbar-primary-link text-decoration-none small fw-semibold d-none d-md-inline ${navInsights ? 'ta-navbar-primary-link--active' : ''}`}
              title={t('nav.insightsTitle')}
            >
              {t('nav.insights')}
            </Link>
          )}
          {token && (
            <Link
              to="/notifications"
              className={`ta-navbar-primary-link text-decoration-none small fw-semibold d-none d-md-inline ${navNotifications ? 'ta-navbar-primary-link--active' : ''}`}
              title={t('nav.notifications')}
              aria-label={t('nav.notifications')}
            >
              <span className="position-relative d-inline-flex align-items-center gap-1">
                <span aria-hidden="true">🔔</span>
                <span className="d-none d-lg-inline">{t('nav.notifications')}</span>
                {notifUnread > 0 && (
                  <span className="badge rounded-pill bg-danger" style={{ fontSize: '0.62rem', lineHeight: 1.1 }}>
                    {notifUnread > 99 ? '99+' : notifUnread}
                  </span>
                )}
              </span>
            </Link>
          )}
          <NavDest
            lock={lockPublicNav}
            to="/community"
            className={`ta-navbar-primary-link text-decoration-none small fw-semibold d-none d-md-inline ${navCommunity ? 'ta-navbar-primary-link--active' : ''}`}
            title={lockPublicNav ? t('nav.inviteOnlyNavLocked') : t('social.navTitle')}
          >
            {t('nav.community')}
          </NavDest>
        </div>
        <div className="vr d-none d-lg-block" style={{ borderColor: 'var(--ta-border)' }} />
        <div className="d-none d-md-flex align-items-center gap-2 flex-wrap">
        {token && (
          <>
            <Link
              to={myPublicProfilePath}
              className={`ta-navbar-meta-link d-none d-md-inline-flex align-items-center text-decoration-none small fw-semibold ${publicProfileNavActive ? 'ta-navbar-meta-link--active' : ''}`}
              style={{
                maxWidth: 'min(200px, 32vw)',
              }}
              title={t('nav.publicProfileTitle')}
              aria-label={t('nav.publicProfileAria')}
            >
              <span className="text-truncate">
                {user?.displayName || user?.email || t('nav.account')}
              </span>
            </Link>
            <Link
              to="/account"
              className="d-none d-md-inline-flex align-items-center justify-content-center text-decoration-none small fw-semibold"
              style={{
                color: 'var(--ta-text-muted)',
                minWidth: '1.75rem',
              }}
              title={t('nav.settingsOnlyTitle')}
              aria-label={t('nav.settingsOnlyAria')}
            >
              <span aria-hidden="true">⚙</span>
            </Link>
          </>
        )}
        {user && isAdmin && (
          <Link
            to="/admin"
            className={`ta-navbar-meta-link text-decoration-none small fw-semibold d-none d-md-inline ${navAdmin ? 'ta-navbar-meta-link--active' : ''}`}
          >
            {t('nav.admin')}
          </Link>
        )}
        <div className="d-none d-md-block">{planControl}</div>

        <div className="d-none d-md-block">
          <ThemeToggleButton compact />
        </div>

        <div className="d-none d-md-block">
          {token ? (
          <button className="btn btn-sm btn-outline-light" onClick={logout}
                  style={{ borderColor: 'var(--ta-border)', color: 'var(--ta-parchment)', fontSize: '0.8rem' }}>
            {t('nav.logout')}
          </button>
        ) : (
          <Link to="/login" className="btn btn-sm btn-outline-light"
                style={{ borderColor: 'var(--ta-border)', color: 'var(--ta-parchment)', fontSize: '0.8rem' }}>
            {t('nav.login', 'Login')}
          </Link>
        )}
        </div>
        </div>
      </div>
      <div className="w-100 d-flex justify-content-end mt-1">
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
                fontSize: '0.7rem',
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
      </div>
    </nav>
  )
}
