import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BrandLogoMark from '../components/BrandLogoMark'
import BrandName from '../components/BrandName'
import AndroidPlayBetaCallout from '../components/AndroidPlayBetaCallout'
import Navbar from '../components/Navbar'
import { THEME_CHANGE_EVENT, getStoredTheme } from '../utils/themePreference'
import { useEffect, useState } from 'react'

const AUDIENCE_KEY = 'ta-public-home-audience'

export default function PublicBetaHomePage() {
  const { t } = useTranslation()
  const [theme, setTheme] = useState(() => getStoredTheme())
  const [audience, setAudience] = useState(() => {
    try {
      const s = localStorage.getItem(AUDIENCE_KEY)
      if (s === 'seller' || s === 'collector') return s
    } catch (_) {
      /* ignore */
    }
    return 'collector'
  })
  const isLight = theme === 'light'

  useEffect(() => {
    const sync = () => setTheme(getStoredTheme())
    window.addEventListener(THEME_CHANGE_EVENT, sync)
    return () => window.removeEventListener(THEME_CHANGE_EVENT, sync)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(AUDIENCE_KEY, audience)
    } catch (_) {
      /* ignore */
    }
  }, [audience])

  const shellStyle = {
    border: '1px solid var(--ta-border)',
    background: isLight
      ? 'linear-gradient(160deg, rgba(255,252,245,0.96) 0%, rgba(248,239,223,0.96) 100%)'
      : 'linear-gradient(165deg, rgba(21,18,14,0.96) 0%, rgba(12,10,8,0.98) 100%)',
    boxShadow: isLight ? '0 14px 34px rgba(82,60,26,0.12)' : '0 24px 60px rgba(0,0,0,0.35)',
  }

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ background: 'var(--ta-bg, #0f0e0c)' }}>
      <Navbar variant="public" hideLoginLink />

      <main className="container py-4 py-lg-5 flex-grow-1">
        <div className="mx-auto" style={{ maxWidth: 960 }}>
          <div className="rounded-4 overflow-hidden w-100 p-4 p-md-5 mb-4" style={shellStyle}>
            <div className="d-flex flex-column flex-md-row align-items-start justify-content-between gap-3 mb-3">
              <div className="d-flex align-items-center gap-3">
                <BrandLogoMark size={56} showIntro />
                <div>
                  <p className="mb-1 small text-uppercase" style={{ letterSpacing: '0.12em', color: 'var(--ta-text-muted)' }}>
                    {t('publicBetaHome.eyebrow')}
                  </p>
                  <h1 className="h3 fw-bold mb-0" style={{ color: 'var(--ta-parchment)' }}>
                    <BrandName />
                  </h1>
                </div>
              </div>
              <div
                className="btn-group btn-group-sm"
                role="group"
                aria-label={t('publicBetaHome.audienceToggleAria')}
              >
                <button
                  type="button"
                  className={`btn ${audience === 'collector' ? 'btn-dark' : 'btn-outline-secondary'}`}
                  onClick={() => setAudience('collector')}
                >
                  {t('publicBetaHome.audienceCollector')}
                </button>
                <button
                  type="button"
                  className={`btn ${audience === 'seller' ? 'btn-dark' : 'btn-outline-secondary'}`}
                  onClick={() => setAudience('seller')}
                >
                  {t('publicBetaHome.audienceSeller')}
                </button>
              </div>
            </div>

            <h2 className="h4 fw-semibold mb-2" style={{ color: 'var(--ta-parchment)' }}>
              {audience === 'seller' ? t('publicBetaHome.taglineSeller') : t('publicBetaHome.taglineCollector')}
            </h2>
            <p className="small mb-3" style={{ color: 'var(--ta-text-muted)', lineHeight: 1.65 }}>
              {audience === 'seller' ? t('publicBetaHome.leadSeller') : t('publicBetaHome.leadCollector')}
            </p>
            <p className="small mb-4 pb-3 border-bottom" style={{ borderColor: 'var(--ta-border)', color: 'var(--ta-text-muted)', lineHeight: 1.6 }}>
              {t('publicBetaHome.betaNote')}
            </p>

            <div className="d-flex flex-wrap gap-2 mb-4">
              {audience === 'seller' ? (
                <>
                  <Link to="/marketplace/sell" className="btn btn-dark fw-semibold px-4 py-2">
                    {t('publicBetaHome.ctaSell')}
                  </Link>
                  <Link to="/marketplace" className="btn btn-outline-secondary fw-semibold px-4 py-2">
                    {t('publicBetaHome.ctaMarketplace')}
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/marketplace" className="btn btn-dark fw-semibold px-4 py-2">
                    {t('publicBetaHome.ctaMarketplace')}
                  </Link>
                  <Link to="/discover" className="btn btn-outline-secondary fw-semibold px-4 py-2">
                    {t('publicBetaHome.ctaDiscover')}
                  </Link>
                </>
              )}
              <Link to="/community" className="btn btn-outline-secondary fw-semibold px-4 py-2">
                {t('publicBetaHome.ctaCommunity')}
              </Link>
            </div>

            <div className="row g-3 mb-0">
              <div className="col-md-4">
                <div className="small fw-semibold mb-1" style={{ color: 'var(--ta-gold)' }}>{t('publicBetaHome.trust1Title')}</div>
                <p className="small text-muted mb-0" style={{ lineHeight: 1.5 }}>{t('publicBetaHome.trust1Body')}</p>
              </div>
              <div className="col-md-4">
                <div className="small fw-semibold mb-1" style={{ color: 'var(--ta-gold)' }}>{t('publicBetaHome.trust2Title')}</div>
                <p className="small text-muted mb-0" style={{ lineHeight: 1.5 }}>{t('publicBetaHome.trust2Body')}</p>
              </div>
              <div className="col-md-4">
                <div className="small fw-semibold mb-1" style={{ color: 'var(--ta-gold)' }}>{t('publicBetaHome.trust3Title')}</div>
                <p className="small text-muted mb-0" style={{ lineHeight: 1.5 }}>{t('publicBetaHome.trust3Body')}</p>
              </div>
            </div>
          </div>

          <div className="rounded-4 overflow-hidden w-100 p-4 p-md-4" style={shellStyle}>
            <AndroidPlayBetaCallout className="mb-4" />
            <div className="d-flex flex-column flex-sm-row flex-wrap gap-2 align-items-stretch">
              <Link to="/login" className="btn btn-dark fw-semibold px-4 py-2 flex-grow-1 flex-sm-grow-0">
                {t('publicBetaHome.ctaLogin')}
              </Link>
              <Link to="/beta/apply" className="btn btn-outline-secondary fw-semibold px-4 py-2 flex-grow-1 flex-sm-grow-0">
                {t('publicBetaHome.ctaApply')}
              </Link>
              <Link to="/pro" className="btn btn-outline-secondary fw-semibold px-4 py-2 flex-grow-1 flex-sm-grow-0">
                {t('publicBetaHome.ctaPro')}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
