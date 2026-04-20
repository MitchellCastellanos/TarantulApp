import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import DiscoverNavSearch from './DiscoverNavSearch'
import { APP_LANGS, LOGIN_LANG_LABELS } from '../constants/languages'
import { appLangBase } from '../utils/appLanguage'

export default function PublicShell({ children }) {
  const { t, i18n } = useTranslation()
  const { token } = useAuth()
  const location = useLocation()
  const onDiscover = location.pathname.startsWith('/descubrir')
  const onQrTool = location.pathname.startsWith('/herramientas/qr')

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ background: 'var(--ta-bg, #0f0e0c)' }}>
      <header
        className="d-flex flex-wrap align-items-center justify-content-between gap-2 px-3 py-2 border-bottom"
        style={{ borderColor: 'var(--ta-border, rgba(200,170,100,0.25))', overflow: 'visible' }}
      >
        <div className="d-flex align-items-center gap-3 flex-shrink-0">
          <Link
            to={token ? '/' : '/login'}
            className="text-decoration-none fw-bold"
            style={{ color: 'var(--ta-parchment, #e8dcc8)', fontSize: '1rem' }}
          >
            🕷️ TarantulApp
          </Link>
          <Link
            to="/descubrir"
            className="text-decoration-none small fw-semibold"
            title={t('nav.discoverLinkTitle')}
            style={{
              color: onDiscover ? 'var(--ta-gold, #c9a227)' : 'var(--ta-text-muted)',
            }}
          >
            {t('discover.navTitle')}
          </Link>
          <Link
            to="/herramientas/qr"
            className="text-decoration-none small fw-semibold"
            title={t('nav.qrToolTitle')}
            style={{
              color: onQrTool ? 'var(--ta-gold, #c9a227)' : 'var(--ta-text-muted)',
            }}
          >
            {t('nav.qrTool')}
          </Link>
        </div>
        {token && (
          <div className="flex-grow-1 order-3 order-md-2" style={{ minWidth: 160, maxWidth: 440 }}>
            <DiscoverNavSearch className="w-100" />
          </div>
        )}
        <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end ms-md-auto order-2 order-md-3">
          <div className="d-flex gap-1">
            {APP_LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                title={LOGIN_LANG_LABELS[l.code]}
                aria-label={LOGIN_LANG_LABELS[l.code]}
                onClick={() => i18n.changeLanguage(l.code)}
                className="btn btn-sm px-2 py-0 border-0"
                style={{
                  background: 'transparent',
                  color: appLangBase(i18n.language) === l.code ? 'var(--ta-gold)' : 'var(--ta-text-muted)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                }}
              >
                {l.display}
              </button>
            ))}
          </div>
          {token ? (
            <Link
              to="/"
              className="btn btn-sm"
              style={{
                border: '1px solid var(--ta-border)',
                color: 'var(--ta-parchment)',
                background: 'transparent',
                fontSize: '0.8rem',
              }}
            >
              {t('discover.myCollection')}
            </Link>
          ) : (
            <Link
              to="/login"
              className="btn btn-sm"
              style={{
                border: '1px solid var(--ta-gold)',
                color: 'var(--ta-gold)',
                background: 'transparent',
                fontSize: '0.8rem',
              }}
            >
              {t('nav.login', 'Login')}
            </Link>
          )}
        </div>
      </header>
      <main className="flex-grow-1 px-3 py-4">{children}</main>
    </div>
  )
}
