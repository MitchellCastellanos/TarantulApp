import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'

const LANGS = [
  { code: 'es', label: 'ES', flag: '🇲🇽' },
  { code: 'en', label: 'EN', flag: '🇺🇸' },
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const { t, i18n } = useTranslation()
  const plan = user?.plan || 'FREE'
  const isPro = plan === 'PRO'

  return (
    <nav className="navbar navbar-dark px-3 px-md-4 py-2">
      <Link to="/" className="navbar-brand text-decoration-none">
        🕷️ TarantulApp
      </Link>
      <div className="d-flex align-items-center gap-2 gap-md-3">
        {user && (
          <Link to="/reminders" className="text-decoration-none d-none d-sm-inline small fw-semibold"
                style={{ color: 'var(--ta-gold)' }}>
            🔔 {t('nav.reminders')}
          </Link>
        )}
        <Link
          to="/pro"
          className="btn btn-sm"
          style={{
            background: isPro ? 'var(--ta-gold)' : 'transparent',
            color: isPro ? '#111' : 'var(--ta-gold)',
            border: '1px solid var(--ta-gold)',
            fontSize: '0.75rem',
          }}
        >
          {isPro ? t('nav.planPro') : t('nav.planFree')}
        </Link>
        {user && (
          <span className="small d-none d-md-inline" style={{ color: 'var(--ta-parchment)', opacity: 0.9 }}>
            {user.displayName || user.email}
          </span>
        )}

        {/* Language selector */}
        <div className="d-flex gap-1">
          {LANGS.map(l => (
            <button
              key={l.code}
              title={l.label}
              onClick={() => i18n.changeLanguage(l.code)}
              className="btn btn-sm px-1 py-0 border-0"
              style={{
                background: 'transparent',
                color: i18n.language === l.code ? 'var(--ta-gold)' : 'rgba(255,255,255,0.4)',
                fontSize: '1.1rem',
                lineHeight: 1,
                transition: 'color 0.15s',
              }}>
              {l.flag}
            </button>
          ))}
        </div>

        {user ? (
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
    </nav>
  )
}
