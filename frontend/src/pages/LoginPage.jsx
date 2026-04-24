import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import publicApi from '../services/publicApi'
import communityService from '../services/communityService'
import ChitinCardFrame from '../components/ChitinCardFrame'
import authService from '../services/authService'
import BrandLogoMark from '../components/BrandLogoMark'
import BrandName from '../components/BrandName'
import Navbar from '../components/Navbar'
import PublicKeeperHandle from '../components/PublicKeeperHandle'
import { THEME_CHANGE_EVENT, getStoredTheme } from '../utils/themePreference'

export default function LoginPage() {
  const { login } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const [mode, setMode] = useState(() => (location.state?.initialMode === 'register' ? 'register' : 'login'))
  const [form, setForm] = useState({ email: '', password: '', displayName: '' })
  const [referralCode, setReferralCode] = useState(() => {
    const r = new URLSearchParams(location.search).get('ref')
    return r ? String(r).trim().toUpperCase() : ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [communityPreview, setCommunityPreview] = useState([])
  const [communityLoading, setCommunityLoading] = useState(true)
  const [theme, setTheme] = useState(() => getStoredTheme())
  const [showIntro, setShowIntro] = useState(false)
  const googleBtnRef = useRef(null)
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const loginRef = useRef(login)
  const tRef = useRef(t)
  loginRef.current = login
  tRef.current = t

  useEffect(() => {
    const r = searchParams.get('ref')
    if (r && String(r).trim()) setReferralCode(String(r).trim().toUpperCase())
  }, [searchParams])

  useEffect(() => {
    let cancelled = false
    setCommunityLoading(true)
    communityService.publicFeed(0, 6)
      .then((data) => {
        if (!cancelled) setCommunityPreview(Array.isArray(data?.content) ? data.content.slice(0, 4) : [])
      })
      .catch(() => {
        if (!cancelled) setCommunityPreview([])
      })
      .finally(() => {
        if (!cancelled) setCommunityLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const syncTheme = () => setTheme(getStoredTheme())
    window.addEventListener(THEME_CHANGE_EVENT, syncTheme)
    return () => window.removeEventListener(THEME_CHANGE_EVENT, syncTheme)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    const seen = localStorage.getItem('tarantulapp-home-intro-seen-v1') === '1'
    if (reducedMotion || seen) return
    setShowIntro(true)
    const t1 = window.setTimeout(() => {
      setShowIntro(false)
      localStorage.setItem('tarantulapp-home-intro-seen-v1', '1')
    }, 2200)
    return () => window.clearTimeout(t1)
  }, [])

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const email = form.email.trim()
    const password = form.password
    if (!email || !password) {
      setError(t('auth.fillRequired'))
      return
    }
    if (mode === 'register' && password.length < 6) {
      setError(t('auth.passwordTooShort'))
      return
    }
    setLoading(true)
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register'
      const body = mode === 'login'
        ? { email, password }
        : {
            email,
            password,
            displayName: form.displayName?.trim() || undefined,
            referralCode: referralCode.trim() || undefined,
          }
      const { data } = await publicApi.post(endpoint, body)
      login(data)
    } catch (err) {
      const st = err.response?.status
      const d = err.response?.data
      const fieldMsgs = d?.fields && typeof d.fields === 'object'
        ? Object.values(d.fields).filter(Boolean).join(' ')
        : ''
      const baseMsg = fieldMsgs || d?.error || t('common.error')
      setError(import.meta.env.DEV && st ? `${baseMsg} (HTTP ${st})` : baseMsg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!googleClientId || !googleBtnRef.current) return
    const existing = document.querySelector('script[data-google-identity="1"]')
    const initGoogle = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (!response?.credential) return
          setLoading(true)
          setError('')
          try {
            const ref = new URLSearchParams(window.location.search).get('ref')
            const data = await authService.oauthGoogle(
              response.credential,
              ref ? String(ref).trim().toUpperCase() : undefined,
            )
            loginRef.current(data)
          } catch (err) {
            const d = err.response?.data
            setError(d?.error || tRef.current('auth.googleLoginError'))
          } finally {
            setLoading(false)
          }
        },
      })
      googleBtnRef.current.innerHTML = ''
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: 'standard',
        shape: 'pill',
        theme: 'outline',
        text: 'continue_with',
        size: 'large',
        width: 320,
      })
    }

    if (existing) {
      initGoogle()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.googleIdentity = '1'
    script.onload = initGoogle
    document.head.appendChild(script)
    return () => {
      if (window.google?.accounts?.id) window.google.accounts.id.cancel()
    }
  }, [googleClientId])

  const isLight = theme === 'light'
  const loginFeatures = [
    { title: t('auth.loginPage.featureDiscoverTitle'), bullets: [t('auth.loginPage.featureDiscoverB1'), t('auth.loginPage.featureDiscoverB2')] },
    { title: t('auth.loginPage.featureCollectionTitle'), bullets: [t('auth.loginPage.featureCollectionB1'), t('auth.loginPage.featureCollectionB2')] },
    { title: t('auth.loginPage.featureMarketplaceTitle'), bullets: [t('auth.loginPage.featureMarketplaceB1'), t('auth.loginPage.featureMarketplaceB2')] },
    { title: t('auth.loginPage.featureCommunityTitle'), bullets: [t('auth.loginPage.featureCommunityB1'), t('auth.loginPage.featureCommunityB2')] },
  ]

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ background: 'var(--ta-bg, #0f0e0c)' }}>
      <Navbar variant="public" hideLoginLink />

      <main className="container py-3 py-lg-4">
        <div className="row g-4 g-xl-5 align-items-start">
          <section className="col-12 col-xl-7">
            <div
              className="p-3 p-md-4 p-lg-5 rounded-4 mb-3"
              style={{
                border: '1px solid var(--ta-border)',
                background: isLight
                  ? 'linear-gradient(160deg, rgba(255,252,245,0.95) 0%, rgba(248,239,223,0.95) 60%, rgba(242,232,214,0.95) 100%)'
                  : 'linear-gradient(165deg, rgba(21,18,14,0.95) 0%, rgba(16,14,11,0.9) 60%, rgba(12,10,8,0.96) 100%)',
                boxShadow: isLight ? '0 14px 34px rgba(82,60,26,0.12)' : '0 24px 60px rgba(0,0,0,0.35)',
              }}
            >
              <div className="d-flex align-items-center gap-3 mb-3">
                <BrandLogoMark size={56} showIntro />
                <div>
                  <p className="mb-1 small text-uppercase" style={{ letterSpacing: '0.12em', color: 'var(--ta-text-muted)' }}>
                    {t('auth.loginPage.heroEyebrow')}
                  </p>
                  <h1 className="h3 fw-bold mb-0" style={{ color: 'var(--ta-parchment)' }}><BrandName /></h1>
                </div>
              </div>
              <h2 className="h4 fw-semibold mb-2" style={{ color: 'var(--ta-parchment)' }}>
                {t('auth.loginPage.heroTagline')}
              </h2>
              <p className="small mb-3" style={{ color: 'var(--ta-text-muted)', lineHeight: 1.6 }}>
                {t('auth.loginPage.heroLead')}
              </p>
              <div className="d-flex flex-wrap gap-2">
                <Link to="/discover" className="btn btn-sm btn-outline-light">{t('auth.loginPage.ctaDiscover')}</Link>
                <Link to="/marketplace" className="btn btn-sm btn-outline-light">{t('auth.loginPage.ctaMarketplace')}</Link>
                <Link to="/community" className="btn btn-sm btn-dark">{t('auth.loginPage.ctaCommunity')}</Link>
              </div>
            </div>

            <div className="row g-3 mb-3">
              {loginFeatures.map((block) => (
                <div className="col-12 col-md-6" key={block.title}>
                  <div
                    className="h-100 rounded-3 p-3"
                    style={{
                      border: '1px solid var(--ta-border)',
                      background: isLight ? 'rgba(255,250,240,0.9)' : 'rgba(26,22,17,0.78)',
                    }}
                  >
                    <h3 className="h6 fw-bold mb-2" style={{ color: 'var(--ta-gold)' }}>{block.title}</h3>
                    <ul className="small mb-0 ps-3" style={{ color: 'var(--ta-text-muted)', lineHeight: 1.5 }}>
                      {block.bullets.map((b) => <li key={b}>{b}</li>)}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            <div
              className="rounded-3 p-3 p-md-4"
              style={{
                border: '1px solid var(--ta-border)',
                background: isLight ? 'rgba(255,249,238,0.92)' : 'rgba(20,17,13,0.85)',
              }}
            >
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h3 className="h6 fw-bold mb-0" style={{ color: 'var(--ta-parchment)' }}>{t('auth.loginPage.previewTitle')}</h3>
                <Link to="/community" className="btn btn-sm btn-outline-secondary">{t('social.seeAll')}</Link>
              </div>
              <p className="small text-muted mb-3">
                {t('auth.loginPage.previewLead')}
              </p>
              <div className="row g-2">
                {communityLoading ? (
                  <div className="col-12">
                    <div className="small text-muted">{t('auth.loginPage.loadingPosts')}</div>
                  </div>
                ) : communityPreview.length === 0 ? (
                  <div className="col-12">
                    <div className="small text-muted">{t('auth.loginPage.noPublicPosts')}</div>
                  </div>
                ) : (
                  communityPreview.map((p) => (
                    <div className="col-12 col-md-6" key={p.id}>
                      <div
                        className="rounded p-2 h-100"
                        style={{
                          border: '1px solid var(--ta-border)',
                          background: isLight ? 'rgba(255,255,255,0.66)' : 'rgba(0,0,0,0.15)',
                        }}
                      >
                        <div className="small fw-semibold mb-1" style={{ color: 'var(--ta-parchment)' }}>
                          {p.authorHandle ? (
                            <PublicKeeperHandle
                              handle={p.authorHandle}
                              displayName={p.authorDisplayName || t('auth.loginPage.keeperFallback')}
                              profilePhoto={p.authorProfilePhoto || p.profilePhoto || null}
                            />
                          ) : (
                            p.authorDisplayName || t('auth.loginPage.keeperFallback')
                          )}
                        </div>
                        <p className="small mb-2" style={{ color: 'var(--ta-text-muted)' }}>
                          {(p.body || '').slice(0, 140) || t('auth.loginPage.postExcerptEmpty')}
                        </p>
                        <div className="small text-muted">
                          {t('auth.loginPage.postStats', { spoods: p.likeCount ?? 0, comments: p.commentsCount ?? 0 })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <aside className="col-12 col-xl-5">
            <ChitinCardFrame showSilhouettes={false} variant="auth">
              <div className="card border-0 bg-transparent shadow-none w-100 mb-0">
                <div className="card-body p-3 p-md-4">
                  <p className="small text-uppercase mb-2" style={{ letterSpacing: '0.12em', color: 'var(--ta-text-muted)' }}>
                    {t('auth.standardEyebrow')}
                  </p>
                  <h3 className="fw-bold mb-1">{mode === 'login' ? <BrandName /> : t('auth.register')}</h3>
                  <p className="small text-muted mb-3">{mode === 'login' ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}</p>

                  {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
                  {mode === 'register' && (
                    <div
                      className="alert py-2 small mb-3"
                      style={{
                        background: isLight ? 'rgba(160,124,49,0.12)' : 'rgba(200,170,80,0.12)',
                        border: '1px solid rgba(200,170,80,0.35)',
                        color: 'var(--ta-parchment)',
                      }}
                    >
                      {t('auth.trialRegisterPromo')}
                    </div>
                  )}

                  <form onSubmit={handleSubmit}>
                    {mode === 'register' && (
                      <div className="mb-3">
                        <label className="form-label fw-semibold small">{t('auth.name')}</label>
                        <input
                          type="text"
                          name="displayName"
                          className="form-control"
                          value={form.displayName}
                          onChange={handleChange}
                          placeholder={t('auth.namePlaceholder')}
                          autoComplete="name"
                        />
                      </div>
                    )}

                    {mode === 'register' && (
                      <div className="mb-3">
                        <label className="form-label fw-semibold small">{t('auth.referralCodeOptional')}</label>
                        <input
                          type="text"
                          className="form-control text-uppercase"
                          value={referralCode}
                          onChange={(e) => setReferralCode(e.target.value.trim().toUpperCase())}
                          placeholder={t('auth.referralCodePlaceholder')}
                          maxLength={32}
                          autoComplete="off"
                        />
                      </div>
                    )}

                    <div className="mb-3">
                      <label className="form-label fw-semibold small">{t('auth.email')}</label>
                      <input
                        type="email"
                        name="email"
                        className="form-control"
                        required
                        value={form.email}
                        onChange={handleChange}
                        placeholder={t('auth.emailPlaceholder')}
                        autoComplete="email"
                      />
                    </div>

                    <div className={mode === 'login' ? 'mb-2' : 'mb-4'}>
                      <label className="form-label fw-semibold small">{t('auth.password')}</label>
                      <input
                        type="password"
                        name="password"
                        className="form-control"
                        required
                        value={form.password}
                        onChange={handleChange}
                        placeholder={mode === 'register' ? t('auth.passwordPlaceholder') : ''}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      />
                    </div>

                    {mode === 'login' && (
                      <div className="mb-4 text-end">
                        <Link to="/forgot-password" className="small text-decoration-none" style={{ color: 'var(--ta-brown-light)' }}>
                          {t('auth.forgotPassword')}
                        </Link>
                      </div>
                    )}

                    <button type="submit" className="btn btn-dark w-100 py-2 fw-semibold" disabled={loading}>
                      {loading ? t('auth.loading') : mode === 'login' ? t('auth.login') : t('auth.register')}
                    </button>
                  </form>

                  <div className="mt-3">
                    <p className="small text-muted mb-2">{t('auth.orContinueWith')}</p>
                    {googleClientId ? (
                      <div ref={googleBtnRef} className="d-flex justify-content-center justify-content-lg-start" />
                    ) : (
                      <p className="small text-muted mb-0">{t('auth.googlePendingConfig')}</p>
                    )}
                  </div>

                  <hr className="my-3" />
                  <p className="small mb-0">
                    {mode === 'login' ? (
                      <>
                        {t('auth.noAccount')}{' '}
                        <button
                          className="btn btn-link btn-sm p-0 text-decoration-none"
                          style={{ color: 'var(--ta-brown)' }}
                          onClick={() => { setMode('register'); setError('') }}
                        >
                          {t('auth.registerLink')}
                        </button>
                      </>
                    ) : (
                      <>
                        {t('auth.hasAccount')}{' '}
                        <button
                          className="btn btn-link btn-sm p-0 text-decoration-none"
                          style={{ color: 'var(--ta-brown)' }}
                          onClick={() => { setMode('login'); setError('') }}
                        >
                          {t('auth.loginLink')}
                        </button>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </ChitinCardFrame>
          </aside>
        </div>
      </main>
      {showIntro && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            zIndex: 2000,
            background: isLight
              ? 'radial-gradient(circle at 50% 35%, rgba(255,255,255,0.98) 0%, rgba(244,236,223,0.98) 62%, rgba(235,225,206,0.98) 100%)'
              : 'radial-gradient(circle at 50% 35%, rgba(28,22,14,0.98) 0%, rgba(12,10,8,0.99) 62%, rgba(5,5,8,0.99) 100%)',
            animation: 'fadeOutIntro 0.6s ease 1.5s forwards',
          }}
        >
          <div className="text-center px-3">
            <div className="d-flex justify-content-center mb-2">
              <BrandLogoMark size={82} showIntro />
            </div>
            <BrandName
              className="cinzel fw-semibold mb-1 d-block"
              style={{ color: 'var(--ta-parchment)', letterSpacing: '0.08em' }}
            />
            <div className="small" style={{ color: 'var(--ta-text-muted)' }}>
              {t('auth.loginPage.heroEyebrow')}
            </div>
          </div>
          <style>{`@keyframes fadeOutIntro { to { opacity: 0; visibility: hidden; } }`}</style>
        </div>
      )}
    </div>
  )
}
