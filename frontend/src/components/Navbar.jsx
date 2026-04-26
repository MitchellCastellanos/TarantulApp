import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import { APP_LANGS, LOGIN_LANG_LABELS } from '../constants/languages'
import { appLangBase } from '../utils/appLanguage'
import ThemeToggleButton from './ThemeToggleButton'
import BrandNavbarLogo from './BrandNavbarLogo'
import notificationsService from '../services/notificationsService'

import { trialCalendarDaysRemaining } from '../utils/trialDaysLeft'

/**
 * @param {{ variant?: 'app' | 'public', hideLoginLink?: boolean }} [props]
 */
export default function Navbar({ variant = 'app', hideLoginLink = false }) {
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

  const path = location.pathname
  const logoHome = !token ? '/login' : '/'
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
            to: '/comunidad',
            label: notifUnread > 0
              ? `${t('nav.community')} (${notifUnread > 99 ? '99+' : notifUnread})`
              : t('nav.community'),
            title: t('social.navTitle'),
            routeMatchers: ['/comunidad'],
          },
        ],
      },
      {
        key: 'account',
        title: t('nav.mobileAccount'),
        items: [
          ...(token
            ? [
                {
                  to: '/account',
                  label: user?.displayName || user?.email || t('nav.account'),
                  routeMatchers: ['/account'],
                },
              ]
            : []),
          ...(!token
            ? [
                {
                  to: '/login',
                  label: t('nav.login', 'Login'),
                  routeMatchers: ['/login'],
                },
              ]
            : []),
          ...(user && isAdmin
            ? [
                {
                  to: '/admin',
                  label: t('nav.admin'),
                  routeMatchers: ['/admin'],
                },
              ]
            : []),
        ],
      },
      {
        key: 'preferences',
        title: t('nav.mobilePreferences'),
        items: [],
      },
    ]
    return groups.filter((group) => !group.hidden)
  }, [isAdmin, notifUnread, t, token, user])
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
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [token])

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
  const mobileSectionButtonStyle = (active) => ({
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    border: `1px solid ${active ? 'rgba(220, 178, 76, 0.8)' : 'var(--ta-border)'}`,
    background: active ? 'rgba(201, 168, 76, 0.18)' : 'rgba(18, 18, 36, 0.66)',
    color: active ? 'var(--ta-gold)' : 'var(--ta-parchment)',
    padding: '0.48rem 0.62rem',
    fontWeight: 600,
    letterSpacing: '0.02em',
    fontSize: '0.8rem',
    textAlign: 'left',
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
        <Link
          to={token ? '/account' : '/login'}
          onClick={closeMobileMenu}
          className="btn btn-sm ta-mobile-icon-btn"
          aria-label={t('nav.accountAria')}
          title={t('nav.accountAria')}
        >
          ◯
        </Link>
        <Link
          to={token ? '/account' : '/login'}
          onClick={closeMobileMenu}
          className="btn btn-sm ta-mobile-icon-btn"
          aria-label={t('nav.preferences', 'Settings')}
          title={t('nav.preferences', 'Settings')}
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
                        <Link
                          key={item.to}
                          onClick={closeMobileMenu}
                          to={item.to}
                          className={item.className}
                          style={item.className ? { fontSize: '0.8rem' } : menuPillStyle(isActive)}
                          title={item.title}
                        >
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="small fw-semibold mb-1 mt-3 ta-mobile-nav-section-title">
          {t('nav.mobilePreferences')}
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
        <div className="d-none d-md-flex align-items-center gap-2 flex-wrap">
          <Link
            to="/descubrir"
            className="text-decoration-none small fw-semibold d-none d-md-inline"
            style={{ color: linkTone(path.startsWith('/descubrir')) }}
            title={t('nav.discoverLinkTitle')}
          >
            {t('nav.discoverSpecies')}
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
            to={token ? '/' : '/login'}
            className="btn btn-sm fw-semibold d-none d-md-inline-flex align-items-center"
            style={{
              background: 'var(--ta-gold)',
              color: '#111',
              border: '1px solid var(--ta-gold)',
              fontSize: '0.78rem',
            }}
            title={token ? t('discover.myCollection', 'My collection') : t('nav.myCollectionGuestHint')}
          >
            {token ? t('discover.myCollection', 'My collection') : t('nav.myCollectionGuestCta')}
          </Link>
          <Link
            to="/comunidad"
            className="text-decoration-none small fw-semibold d-none d-md-inline"
            style={{ color: linkTone(path.startsWith('/comunidad')) }}
            title={t('social.navTitle')}
          >
            <span className="position-relative d-inline-flex align-items-center gap-1">
              <span>{t('nav.community')}</span>
              {notifUnread > 0 && (
                <span className="badge rounded-pill bg-danger" style={{ fontSize: '0.62rem', lineHeight: 1.1 }}>
                  {notifUnread > 99 ? '99+' : notifUnread}
                </span>
              )}
            </span>
          </Link>
        </div>
        <div className="vr d-none d-lg-block" style={{ borderColor: 'var(--ta-border)' }} />
        <div className="d-none d-md-flex align-items-center gap-2 flex-wrap">
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
