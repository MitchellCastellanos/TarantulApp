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

  return (
    <nav className="navbar navbar-dark px-3 px-md-4 py-2">
      <Link to="/" className="navbar-brand text-decoration-none">
        🕷️ TarantulApp
      </Link>
      <div className="d-flex align-items-center gap-2 gap-md-3">
        <Link to="/reminders" className="text-warning small text-decoration-none d-none d-sm-inline"
              style={{ opacity: 0.85 }}>
          🔔 {t('nav.reminders')}
        </Link>
        <span className="text-secondary small d-none d-md-inline" style={{ opacity: 0.7 }}>
          {user?.displayName || user?.email}
        </span>

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

        <button className="btn btn-sm btn-outline-light" onClick={logout}
                style={{ borderColor: 'var(--ta-border)', color: 'var(--ta-parchment)', fontSize: '0.8rem' }}>
          {t('nav.logout')}
        </button>
      </div>
    </nav>
  )
}
