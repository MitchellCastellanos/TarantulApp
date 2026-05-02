import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BrandLogoMark from '../components/BrandLogoMark'
import BrandName from '../components/BrandName'
import Navbar from '../components/Navbar'
import { THEME_CHANGE_EVENT, getStoredTheme } from '../utils/themePreference'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'

export default function BetaPendingHomePage() {
  const { t } = useTranslation()
  const { logout, user } = useAuth()
  const [theme, setTheme] = useState(() => getStoredTheme())
  const isLight = theme === 'light'

  useEffect(() => {
    const sync = () => setTheme(getStoredTheme())
    window.addEventListener(THEME_CHANGE_EVENT, sync)
    return () => window.removeEventListener(THEME_CHANGE_EVENT, sync)
  }, [])

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ background: 'var(--ta-bg, #0f0e0c)' }}>
      <Navbar variant="public" hideLoginLink />

      <main className="container py-4 py-lg-5 flex-grow-1 d-flex align-items-center">
        <div
          className="rounded-4 overflow-hidden w-100 p-4 p-md-5 mx-auto"
          style={{
            maxWidth: 720,
            border: '1px solid var(--ta-border)',
            background: isLight
              ? 'linear-gradient(160deg, rgba(255,252,245,0.95) 0%, rgba(248,239,223,0.95) 100%)'
              : 'linear-gradient(165deg, rgba(21,18,14,0.95) 0%, rgba(12,10,8,0.96) 100%)',
            boxShadow: isLight ? '0 14px 34px rgba(82,60,26,0.12)' : '0 24px 60px rgba(0,0,0,0.35)',
          }}
        >
          <div className="d-flex align-items-center gap-3 mb-3">
            <BrandLogoMark size={56} showIntro />
            <div>
              <p className="mb-1 small text-uppercase" style={{ letterSpacing: '0.12em', color: 'var(--ta-text-muted)' }}>
                {t('auth.loginPage.heroEyebrow')}
              </p>
              <h1 className="h3 fw-bold mb-0" style={{ color: 'var(--ta-parchment)' }}>
                <BrandName />
              </h1>
            </div>
          </div>
          <h2 className="h5 fw-semibold mb-2" style={{ color: 'var(--ta-gold)' }}>
            {t('betaPending.title')}
          </h2>
          <p className="small mb-2" style={{ color: 'var(--ta-text-muted)', lineHeight: 1.65 }}>
            {t('betaPending.lead')}
          </p>
          {user?.email ? (
            <p className="small mb-4" style={{ color: 'var(--ta-parchment)' }}>
              <span className="text-muted">{t('betaPending.signedInAs')} </span>
              {user.email}
            </p>
          ) : (
            <div className="mb-4" />
          )}
          <div className="d-flex flex-column flex-sm-row gap-2 mb-3">
            <Link to="/beta/apply" className="btn btn-dark fw-semibold px-4 py-2">
              {t('betaPending.ctaApply')}
            </Link>
            <button type="button" className="btn btn-outline-secondary fw-semibold px-4 py-2" onClick={() => logout()}>
              {t('betaPending.logout')}
            </button>
          </div>
          <p className="small mb-0" style={{ color: 'var(--ta-text-muted)' }}>
            {t('betaPending.footerHint')}
          </p>
        </div>
      </main>
    </div>
  )
}
