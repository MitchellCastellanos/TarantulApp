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
function NavDest({ lock, to, className, title, style, children, onClick, 'aria-label': ariaLabel }) {
  if (lock) {
    return (
      <span
        className={className}
        style={{ ...(style || {}), opacity: 0.55, cursor: 'not-allowed' }}
        title={title}
        aria-label={ariaLabel}
        aria-disabled="true"
      >
        {children}
      </span>
    )
  }
  return (
    <Link to={to} className={className} style={style} title={title} onClick={onClick} aria-label={ariaLabel}>
      {children}
    </Link>
  )
}

/**
 * @param {{ variant?: 'app' | 'public', hideLoginLink?: boolean }} [props]
 */
export default function Navbar({ variant = 'app', hideLoginLink = false }) {
  const { token, user, logout } = useAuth()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [notifUnread, setNotifUnread] = useState(0)
  const plan = user?.plan || 'FREE'
  const isPro = plan === 'PRO'
  const inTrial = user?.inTrial === true
  const overFreeLimit = user?.overFreeLimit === true
  const days = trialCalendarDaysRemaining(user?.trialEndsAt)
  // Admin gating is server-driven (users.is_admin via AuthResponse#admin); no client-side fallback,
  // since shipping admin emails in the bundle leaks ops staff and lets attackers target them.
  const isAdmin = user?.admin === true

  const inviteOnlyNav = isInviteOnlyEnabled()
  const lockPublicNav = inviteOnlyNav && !token
  const path = location.pathname
  const navDiscover = path.startsWith('/descubrir')
  const navQr =
    path.startsWith('/tools/qr') ||
    path.startsWith('/herramientas/qr') ||
    path.startsWith('/tarantulas/qr-print')
  const navMarketplace = path.startsWith('/marketplace')
  const navSexId = path.startsWith('/sex-id')
  const navCollection = Boolean(token) && path === '/'
  const navInsights = Boolean(token) && path.startsWith('/insights')
  const navNotifications = path.startsWith('/notifications')
  const navAdmin = path.startsWith('/admin')
  const logoHome = !token ? (inviteOnlyNav ? '/' : '/login') : '/'
  const isAuthPage =
    path === '/login' ||
    path.startsWith('/forgot-password') ||
    path.startsWith('/reset-password')
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

  useEffect(() => {
    closeMobileMenu()
    setMoreMenuOpen(false)
  }, [path])

  useEffect(() => {
    if (isAuthPage) return undefined
    document.body.classList.add('ta-app-chrome')
    return () => document.body.classList.remove('ta-app-chrome')
  }, [isAuthPage])

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

  const renderMoreContent = (onClick) => (
    <>
      {token ? (
        <>
          <Link to={myPublicProfilePath} onClick={onClick} className="ta-more__item">
            <i className="bi bi-person" aria-hidden="true" /> {t('nav.publicProfileTitle')}
          </Link>
          <Link to="/account" onClick={onClick} className="ta-more__item">
            <i className="bi bi-gear" aria-hidden="true" /> {t('nav.accountSettings')}
          </Link>
        </>
      ) : (
        <Link to="/login" onClick={onClick} className="ta-more__item">
          <i className="bi bi-box-arrow-in-right" aria-hidden="true" /> {t('nav.login', 'Login')}
        </Link>
      )}
      <Link to="/pro" onClick={onClick} className="ta-more__item">
        <i className="bi bi-star" aria-hidden="true" /> {t('nav.proMenuItem', 'Pro / plan')}
      </Link>
      {user && isAdmin && (
        <Link to="/admin" onClick={onClick} className="ta-more__item">
          <i className="bi bi-shield-lock" aria-hidden="true" /> {t('nav.admin')}
        </Link>
      )}
      <div className="ta-more__row">
        <ThemeToggleButton compact />
        <div className="d-flex gap-1 align-items-center">
          {APP_LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              title={LOGIN_LANG_LABELS[l.code]}
              aria-label={LOGIN_LANG_LABELS[l.code]}
              onClick={() => i18n.changeLanguage(l.code)}
              className="btn btn-sm px-1 py-0 border-0"
              style={{
                background: 'transparent',
                color: appLangBase(i18n.language) === l.code ? 'var(--ta-gold)' : 'var(--ta-text-muted)',
                fontSize: '0.72rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              {l.display}
            </button>
          ))}
        </div>
      </div>
      {token && (
        <button
          type="button"
          className="ta-more__item ta-more__item--btn"
          onClick={() => {
            onClick?.()
            logout()
          }}
        >
          <i className="bi bi-box-arrow-right" aria-hidden="true" /> {t('nav.logout')}
        </button>
      )}
    </>
  )

  if (isAuthPage) {
    return (
      <nav className="ta-auth-topbar">
        <BrandNavbarLogo key={path} homeTo={logoHome} showIntro disableLink={lockPublicNav} />
        <div className="ms-auto d-flex align-items-center gap-2">
          <ThemeToggleButton compact />
          <div className="d-flex gap-1 align-items-center">
            {APP_LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                title={LOGIN_LANG_LABELS[l.code]}
                aria-label={LOGIN_LANG_LABELS[l.code]}
                onClick={() => i18n.changeLanguage(l.code)}
                className="btn btn-sm px-1 py-0 border-0"
                style={{
                  background: 'transparent',
                  color: appLangBase(i18n.language) === l.code ? 'var(--ta-gold)' : 'var(--ta-text-muted)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
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

  {
    const railItems = [
      {
        to: token ? '/' : inviteOnlyNav ? '/' : '/login',
        icon: 'bi-house-door',
        label: token ? t('discover.myCollection', 'My collection') : t('nav.myCollectionGuestCta'),
        active: navCollection,
      },
      { to: '/descubrir', icon: 'bi-compass', label: t('nav.discoverSpecies'), active: navDiscover },
      { to: '/marketplace', icon: 'bi-shop', label: t('marketplace.nav'), active: navMarketplace },
      { to: '/sex-id', icon: 'bi-gender-ambiguous', label: t('nav.sexId', 'Sex ID'), active: navSexId },
      { to: '/tools/qr', icon: 'bi-qr-code', label: t('nav.qrTool'), active: navQr },
      ...(token
        ? [
            { to: '/insights', icon: 'bi-graph-up', label: t('nav.insights'), active: navInsights },
            { to: '/notifications', icon: 'bi-bell', label: t('nav.notifications'), active: navNotifications, badge: notifUnread },
          ]
        : []),
    ]
    const bottomTabs = railItems.slice(0, 4)

    return (
      <>
        {/* Desktop: vertical rail (X / Instagram style) */}
        <nav className="ta-rail d-none d-md-flex" aria-label={t('nav.primaryNavAria', 'Primary')}>
          <div className="ta-rail__brand">
            <BrandNavbarLogo key={path} homeTo={logoHome} showIntro disableLink={lockPublicNav} />
          </div>
          <div className="ta-rail__items">
            {railItems.map((it) => (
              <NavDest
                key={it.to + it.label}
                lock={lockPublicNav}
                to={it.to}
                className={`ta-rail__link ${it.active ? 'is-active' : ''}`}
                title={lockPublicNav ? t('nav.inviteOnlyNavLocked') : it.label}
              >
                <i className={`bi ${it.icon} ta-rail__icon`} aria-hidden="true" />
                <span className="ta-rail__label">{it.label}</span>
                {it.badge > 0 ? (
                  <span className="badge rounded-pill bg-danger ms-auto" style={{ fontSize: '0.6rem' }}>
                    {it.badge > 99 ? '99+' : it.badge}
                  </span>
                ) : null}
              </NavDest>
            ))}
          </div>
          <div className="ta-rail__footer">
            {planControl}
            <div className="position-relative w-100">
              <button
                type="button"
                className={`ta-rail__more ${moreMenuOpen ? 'is-open' : ''}`}
                onClick={() => setMoreMenuOpen((o) => !o)}
                aria-expanded={moreMenuOpen}
              >
                <i className="bi bi-person-circle ta-rail__icon" aria-hidden="true" />
                <span className="ta-rail__label text-truncate">
                  {token ? user?.displayName || user?.email || t('nav.more', 'More') : t('nav.more', 'More')}
                </span>
                <span aria-hidden="true" className="ms-auto">{moreMenuOpen ? '▾' : '▸'}</span>
              </button>
              {moreMenuOpen && (
                <div className="ta-more-menu">{renderMoreContent(() => setMoreMenuOpen(false))}</div>
              )}
            </div>
          </div>
        </nav>

        {/* Mobile: slim top bar */}
        <nav className="ta-mtop d-md-none" aria-label={t('nav.primaryNavAria', 'Primary')}>
          <BrandNavbarLogo key={`m-${path}`} homeTo={logoHome} showIntro disableLink={lockPublicNav} />
          <div className="ms-auto d-flex align-items-center gap-1">
            {token && (
              <Link to="/notifications" className="btn btn-sm ta-mobile-icon-btn position-relative" aria-label={t('nav.notifications')}>
                <i className="bi bi-bell" aria-hidden="true" />
                {notifUnread > 0 && (
                  <span className="badge rounded-pill bg-danger position-absolute top-0 start-100 translate-middle" style={{ fontSize: '0.55rem' }}>
                    {notifUnread > 99 ? '99+' : notifUnread}
                  </span>
                )}
              </Link>
            )}
            <Link
              to={token ? myPublicProfilePath : '/login'}
              className="btn btn-sm ta-mobile-icon-btn"
              aria-label={token ? t('nav.publicProfileAria') : t('nav.login', 'Login')}
            >
              <i className="bi bi-person-circle" aria-hidden="true" />
            </Link>
          </div>
        </nav>

        {/* Mobile: bottom tab bar */}
        <nav className="ta-bottomnav d-md-none" aria-label={t('nav.primaryNavAria', 'Primary')}>
          {bottomTabs.map((it) => (
            <NavDest
              key={`tab-${it.to}`}
              lock={lockPublicNav}
              to={it.to}
              className={`ta-bottomnav__tab ${it.active ? 'is-active' : ''}`}
              title={lockPublicNav ? t('nav.inviteOnlyNavLocked') : it.label}
            >
              <i className={`bi ${it.icon} ta-bottomnav__icon`} aria-hidden="true" />
              <span className="ta-bottomnav__label">{it.label}</span>
            </NavDest>
          ))}
          <button
            type="button"
            className={`ta-bottomnav__tab ${mobileMenuOpen ? 'is-active' : ''}`}
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-expanded={mobileMenuOpen}
          >
            <i className="bi bi-list ta-bottomnav__icon" aria-hidden="true" />
            <span className="ta-bottomnav__label">{t('nav.more', 'More')}</span>
          </button>
        </nav>

        {/* Mobile: "More" sheet */}
        {mobileMenuOpen && (
          <div className="ta-more-sheet d-md-none" role="dialog" aria-modal="true" onClick={() => setMobileMenuOpen(false)}>
            <div className="ta-more-sheet__panel" onClick={(e) => e.stopPropagation()}>
              <div className="ta-more-sheet__handle" aria-hidden="true" />
              {token && (
                <Link to="/insights" onClick={() => setMobileMenuOpen(false)} className="ta-more__item">
                  <i className="bi bi-graph-up" aria-hidden="true" /> {t('nav.insights')}
                </Link>
              )}
              <Link to="/tools/qr" onClick={() => setMobileMenuOpen(false)} className="ta-more__item">
                <i className="bi bi-qr-code" aria-hidden="true" /> {t('nav.qrTool')}
              </Link>
              {renderMoreContent(() => setMobileMenuOpen(false))}
            </div>
          </div>
        )}
      </>
    )
  }

}
