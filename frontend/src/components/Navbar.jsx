import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import DiscoverNavSearch from './DiscoverNavSearch'
import { APP_LANGS, LOGIN_LANG_LABELS } from '../constants/languages'
import { appLangBase } from '../utils/appLanguage'
import ThemeToggleButton from './ThemeToggleButton'
import BrandNavbarLogo from './BrandNavbarLogo'

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
  const { t, i18n } = useTranslation()
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

  const linkTone = (active) =>
    variant === 'public'
      ? active
        ? 'var(--ta-gold)'
        : 'var(--ta-text-muted)'
      : 'var(--ta-gold)'

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
      <div className="d-flex align-items-center gap-2 gap-md-3 flex-wrap justify-content-end flex-grow-1">
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
          className="text-decoration-none small fw-semibold"
          style={{ color: linkTone(path.startsWith('/descubrir')) }}
          title={t('nav.discoverLinkTitle')}
        >
          {t('discover.navTitle')}
        </Link>
        <Link
          to="/herramientas/qr"
          className="text-decoration-none small fw-semibold"
          style={{ color: linkTone(path.startsWith('/herramientas/qr')) }}
          title={t('nav.qrToolTitle')}
        >
          {t('nav.qrTool')}
        </Link>
        <Link
          to="/marketplace"
          className="text-decoration-none small fw-semibold"
          style={{ color: linkTone(path.startsWith('/marketplace')) }}
          title={t('marketplace.title')}
        >
          {t('marketplace.nav')}
        </Link>
        <Link
          to={token ? '/comunidad' : '/login'}
          state={token ? undefined : { redirectAfterAuth: '/comunidad' }}
          className="text-decoration-none small fw-semibold"
          style={{ color: linkTone(path.startsWith('/comunidad')) }}
          title={t('social.navTitle')}
        >
          {t('nav.community')}
        </Link>
        <Link
          to="/about"
          className="text-decoration-none small fw-semibold"
          style={{ color: linkTone(path.startsWith('/about')) }}
          title={t('nav.aboutTitle')}
        >
          {t('nav.about')}
        </Link>
        {token && (
          <Link to="/reminders" className="text-decoration-none d-none d-sm-inline small fw-semibold"
                style={{ color: 'var(--ta-gold)' }}>
            🔔 {t('nav.reminders')}
          </Link>
        )}
        {token && (
          <Link
            to="/account"
            className="d-inline-flex align-items-center gap-1 text-decoration-none small fw-semibold"
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
          <Link to="/admin" className="text-decoration-none small fw-semibold" style={{ color: 'var(--ta-gold)' }}>
            {t('nav.admin')}
          </Link>
        )}
        {planControl}

        <div className="d-flex gap-1 align-items-center">
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

        <ThemeToggleButton compact />

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
    </nav>
  )
}
