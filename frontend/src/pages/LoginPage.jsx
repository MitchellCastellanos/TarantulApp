import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import publicApi from '../services/publicApi'
import authService from '../services/authService'
import BrandLogoMark from '../components/BrandLogoMark'
import BrandName from '../components/BrandName'
import PlayStoreEarlyAccessCallout from '../components/PlayStoreEarlyAccessCallout'
import Navbar from '../components/Navbar'
import LoginFeaturedPartners from '../components/LoginFeaturedPartners'
import { THEME_CHANGE_EVENT, getStoredTheme } from '../utils/themePreference'
import { isInviteOnlyEnabled } from '../utils/inviteOnly'
import { inferBillingRegion } from '../utils/inferBillingRegion'
import HCaptchaWidget, { isCaptchaEnabled } from '../components/HCaptchaWidget'
import { usePageSeo } from '../hooks/usePageSeo'

const LOGIN_AUDIENCE_KEY = 'ta-login-audience'

export default function LoginPage() {
  const { login } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const seoOrigin = typeof window !== 'undefined' ? window.location.origin : ''
  usePageSeo({
    title: t('login.metaTitle', {
      defaultValue: 'TarantulApp™ — Tarantula keeper logbook, species catalog & marketplace',
    }),
    description: t('login.metaDescription', {
      defaultValue: 'Track your tarantula collection: feeding & molt reminders, terrarium QR labels, a sourced species catalog (WSC/GBIF), and a keeper marketplace. Free on web and Android.',
    }),
    imageUrl: seoOrigin ? `${seoOrigin}/og-social.png` : undefined,
    canonicalHref: seoOrigin ? `${seoOrigin}/login` : undefined,
  })
  const [mode, setMode] = useState(() => (location.state?.initialMode === 'register' ? 'register' : 'login'))
  const [form, setForm] = useState({ email: '', password: '', displayName: '', legalAccepted: false })
  const [captchaToken, setCaptchaToken] = useState('')
  const [referralCode, setReferralCode] = useState(() => {
    const r = new URLSearchParams(location.search).get('ref')
    return r ? String(r).trim().toUpperCase() : ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [theme, setTheme] = useState(() => getStoredTheme())
  const [showIntro, setShowIntro] = useState(false)
  const [loginAudience, setLoginAudience] = useState(() => {
    try {
      const s = localStorage.getItem(LOGIN_AUDIENCE_KEY)
      if (s === 'seller' || s === 'collector') return s
    } catch (_) {
      /* ignore */
    }
    return 'collector'
  })
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

  const inviteOnly = isInviteOnlyEnabled()
  const [registrationPolicy, setRegistrationPolicy] = useState(() => ({
    mode: inviteOnly ? 'invite_only' : 'open_limited',
    registrationOpen: !inviteOnly,
  }))
  useEffect(() => {
    if (inviteOnly) setMode('login')
  }, [inviteOnly])

  /** Banner “Create account” navigates here with state; sync tab when already on /login */
  useEffect(() => {
    if (location.state?.initialMode !== 'register') return
    if (inviteOnly) return
    if (!registrationPolicy.registrationOpen) return
    setMode('register')
    setError('')
  }, [location.state, inviteOnly, registrationPolicy.registrationOpen])

  useEffect(() => {
    let cancelled = false
    publicApi
      .get('auth/registration-policy')
      .then(({ data }) => {
        if (cancelled) return
        const mode = data?.mode === 'open_limited' ? 'open_limited' : 'invite_only'
        setRegistrationPolicy({
          mode,
          registrationOpen: Boolean(data?.registrationOpen),
        })
      })
      .catch(() => {
        if (cancelled) return
        setRegistrationPolicy({
          mode: inviteOnly ? 'invite_only' : 'open_limited',
          registrationOpen: !inviteOnly,
        })
      })
    return () => {
      cancelled = true
    }
  }, [inviteOnly])


  useEffect(() => {
    const syncTheme = () => setTheme(getStoredTheme())
    window.addEventListener(THEME_CHANGE_EVENT, syncTheme)
    return () => window.removeEventListener(THEME_CHANGE_EVENT, syncTheme)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(LOGIN_AUDIENCE_KEY, loginAudience)
    } catch (_) {
      /* ignore */
    }
  }, [loginAudience])

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
    if (!inviteOnly && mode === 'register' && password.length < 6) {
      setError(t('auth.passwordTooShort'))
      return
    }
    if (!inviteOnly && mode === 'register' && !form.legalAccepted) {
      setError(t('auth.legalMustAccept'))
      return
    }
    if (!inviteOnly && mode === 'register' && isCaptchaEnabled() && !captchaToken) {
      setError(t('auth.captchaRequired', 'Por favor completa el captcha.'))
      return
    }
    setLoading(true)
    try {
      const endpoint = inviteOnly || mode === 'login' ? '/auth/login' : '/auth/register'
      const body = inviteOnly || mode === 'login'
        ? { email, password }
        : {
            email,
            password,
            displayName: form.displayName?.trim() || undefined,
            referralCode: referralCode.trim() || undefined,
            legalAccepted: !!form.legalAccepted,
            captchaToken: captchaToken || undefined,
          }
      const { data } = await publicApi.post(endpoint, body)
      const tok = data?.token != null ? String(data.token).trim() : ''
      if (!tok) {
        setError(t('auth.loginBadResponse'))
        return
      }
      login(data)
    } catch (err) {
      const st = err.response?.status
      const d = err.response?.data
      const code = d?.error
      if (code === 'REGISTRATION_CLOSED') {
        setError(t('auth.registrationClosed'))
      } else if (!err.response) {
        setError(t('auth.networkError'))
      } else {
      const fieldMsgs = d?.fields && typeof d.fields === 'object'
        ? Object.values(d.fields).filter(Boolean).join(' ')
        : ''
      const baseMsg = fieldMsgs || (typeof code === 'string' ? code : '') || t('common.error')
      setError(import.meta.env.DEV && st ? `${baseMsg} (HTTP ${st})` : baseMsg)
      }
      if (mode === 'register') setCaptchaToken('')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (inviteOnly) return undefined
    if (!googleClientId || !googleBtnRef.current) return undefined
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
            if (d?.error === 'REGISTRATION_CLOSED') {
              setError(tRef.current('auth.registrationClosed'))
            } else if (d?.error === 'GOOGLE_TOKEN_INVALID') {
              setError(tRef.current('auth.GOOGLE_TOKEN_INVALID'))
            } else {
            setError(d?.error || tRef.current('auth.googleLoginError'))
            }
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
  }, [googleClientId, inviteOnly])

  const isLight = theme === 'light'
  const showRegisterUi = registrationPolicy.registrationOpen && !inviteOnly
  const loginFeatureBlocks = useMemo(() => {
    const blocks = {
      discover: {
        title: t('auth.loginPage.featureDiscoverTitle'),
        bullets: [t('auth.loginPage.featureDiscoverB1'), t('auth.loginPage.featureDiscoverB2')],
      },
      collection: {
        title: t('auth.loginPage.featureCollectionTitle'),
        bullets: [t('auth.loginPage.featureCollectionB1'), t('auth.loginPage.featureCollectionB2')],
      },
      marketplace: {
        title: t('auth.loginPage.featureMarketplaceTitle'),
        bullets: [t('auth.loginPage.featureMarketplaceB1'), t('auth.loginPage.featureMarketplaceB2')],
      },
    }
    const order = loginAudience === 'seller'
      ? ['marketplace', 'collection', 'discover']
      : ['discover', 'collection', 'marketplace']
    return order.map((k) => blocks[k])
  }, [t, loginAudience])

  const billingRegion = useMemo(() => inferBillingRegion(), [])
  const regionalProPrice = t(`pro.regions.${billingRegion}.priceMonthly`, {
    defaultValue: t('pro.regions.US.priceMonthly'),
  })

  const heroTagline = loginAudience === 'seller'
    ? t('auth.loginPage.heroTaglineSeller')
    : t('auth.loginPage.heroTaglineCollector')
  const heroLead = loginAudience === 'seller'
    ? t('auth.loginPage.heroLeadSeller')
    : t('auth.loginPage.heroLeadCollector')

  return (
    <div className="ta-login-page min-vh-100 d-flex flex-column" style={{ background: 'var(--ta-bg, #0f0e0c)' }}>
      <Navbar hideLoginLink />

      <main className="container flex-grow-1 py-3 py-lg-4">
        <div className="row justify-content-center g-0">
          <div className="col-12 col-xl-11 col-xxl-10 d-flex flex-column gap-4 gap-lg-5">
            <div className="row g-4 align-items-stretch">
              {/* Pitch — identity + audience toggle */}
              <div className="col-lg-6">
                <section
                  className="rounded-4 h-100 p-3 p-md-4 p-lg-5 d-flex flex-column"
                  style={{
                    border: '1px solid var(--ta-border)',
                    background: isLight
                      ? 'linear-gradient(160deg, rgba(255,252,245,0.95) 0%, rgba(248,239,223,0.95) 60%, rgba(242,232,214,0.95) 100%)'
                      : 'linear-gradient(165deg, rgba(21,18,14,0.95) 0%, rgba(16,14,11,0.9) 60%, rgba(12,10,8,0.96) 100%)',
                    boxShadow: isLight ? '0 14px 34px rgba(82,60,26,0.12)' : '0 24px 60px rgba(0,0,0,0.35)',
                  }}
                >
                  <div className="d-flex align-items-start justify-content-between gap-2 flex-wrap mb-3">
                    <div className="d-flex align-items-center gap-3">
                      <BrandLogoMark size={56} showIntro />
                      <div>
                        <p className="mb-1 small text-uppercase" style={{ letterSpacing: '0.12em', color: 'var(--ta-text-muted)' }}>
                          {t('auth.loginPage.heroEyebrow')}
                        </p>
                        <h1 className="h3 fw-bold mb-0" style={{ color: 'var(--ta-parchment)' }}><BrandName /></h1>
                      </div>
                    </div>
                    <div className="btn-group btn-group-sm" role="group" aria-label={t('auth.loginPage.audienceToggleAria')}>
                      <button
                        type="button"
                        className={`btn ${loginAudience === 'collector' ? 'btn-dark' : 'btn-outline-secondary'}`}
                        onClick={() => setLoginAudience('collector')}
                      >
                        {t('auth.loginPage.audienceCollector')}
                      </button>
                      <button
                        type="button"
                        className={`btn ${loginAudience === 'seller' ? 'btn-dark' : 'btn-outline-secondary'}`}
                        onClick={() => setLoginAudience('seller')}
                      >
                        {t('auth.loginPage.audienceSeller')}
                      </button>
                    </div>
                  </div>
                  <h2 className="h4 fw-semibold mb-2" style={{ color: 'var(--ta-parchment)' }}>
                    {heroTagline}
                  </h2>
                  <p className="small mb-3 flex-grow-1" style={{ color: 'var(--ta-text-muted)', lineHeight: 1.65 }}>
                    {heroLead}
                  </p>
                  {!inviteOnly && (
                    <div className="d-flex flex-wrap gap-2 mt-auto pt-1">
                      {loginAudience === 'seller' ? (
                        <>
                          <Link to="/marketplace/sell" className="btn btn-sm btn-warning fw-semibold text-dark">
                            {t('publicBetaHome.ctaSell')}
                          </Link>
                          <Link to="/partners" className="btn btn-sm btn-dark">{t('auth.loginPage.ctaBecomePartner')}</Link>
                          <Link to="/marketplace" className="btn btn-sm btn-outline-light">{t('auth.loginPage.ctaMarketplace')}</Link>
                        </>
                      ) : (
                        <>
                          <Link to="/discover" className="btn btn-sm btn-outline-light">{t('auth.loginPage.ctaDiscover')}</Link>
                          <Link to="/marketplace" className="btn btn-sm btn-dark">{t('auth.loginPage.ctaMarketplace')}</Link>
                          <Link to="/partner/monarch-reptiles" className="btn btn-sm btn-outline-warning">
                            {t('auth.loginPage.ctaFoundingExample')}
                          </Link>
                        </>
                      )}
                      <Link to="/pro" className="btn btn-sm btn-outline-secondary">{t('publicBetaHome.ctaPro')}</Link>
                    </div>
                  )}
                  {!inviteOnly && loginAudience === 'seller' && <LoginFeaturedPartners compact />}
                </section>
              </div>

              {/* Auth form */}
              <div className="col-lg-6">
                <section
                  className="rounded-4 overflow-hidden h-100 d-flex flex-column"
                  style={{
                    border: '1px solid var(--ta-border)',
                    boxShadow: isLight ? '0 14px 34px rgba(82,60,26,0.12)' : '0 24px 60px rgba(0,0,0,0.35)',
                  }}
                >
              <div
                className="px-3 px-md-4 px-lg-5 py-3 py-md-4 flex-grow-1 d-flex flex-column"
                style={{
                  background: isLight ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.22)',
                }}
              >
                <p className="small text-uppercase mb-2" style={{ letterSpacing: '0.12em', color: 'var(--ta-text-muted)' }}>
                  {t('auth.standardEyebrow')}
                </p>
                <h3 className="fw-bold mb-1">
                  {inviteOnly ? t('auth.betaFormTitle') : mode === 'login' ? <BrandName /> : t('auth.register')}
                </h3>
                <p className="small text-muted mb-3">
                  {showRegisterUi
                    ? mode === 'login'
                      ? t('auth.loginSubtitle')
                      : t('auth.registerSubtitle')
                    : t('auth.betaLoginSubtitle')}
                </p>
                {!showRegisterUi && (
                  <p className="small mb-3" style={{ color: 'var(--ta-text-muted)' }}>
                    {t('auth.loginPage.registrationGateBlurb')}
                  </p>
                )}

                <PlayStoreEarlyAccessCallout
                  className="mb-3"
                  inviteOnly={inviteOnly}
                  onGoRegister={
                    showRegisterUi
                      ? () => {
                          setMode('register')
                          setError('')
                        }
                      : undefined
                  }
                />

                {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}
                {showRegisterUi && mode === 'register' && (
                  <div
                    className="alert py-2 small mb-3"
                    style={{
                      background: isLight ? 'rgba(160,124,49,0.12)' : 'rgba(200,170,80,0.12)',
                      border: '1px solid rgba(200,170,80,0.35)',
                      color: 'var(--ta-parchment)',
                    }}
                  >
                    {t('auth.trialRegisterPromo', { price: regionalProPrice })}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {showRegisterUi && mode === 'register' && (
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

                  {showRegisterUi && mode === 'register' && (
                    <div className="mb-3 form-check">
                      <input
                        id="register-legal-accept"
                        className="form-check-input"
                        type="checkbox"
                        checked={!!form.legalAccepted}
                        onChange={(e) => setForm((prev) => ({ ...prev, legalAccepted: e.target.checked }))}
                      />
                      <label htmlFor="register-legal-accept" className="form-check-label small">
                        {t('auth.legalAcceptPrefix')}{' '}
                        <Link to="/terms" target="_blank" rel="noreferrer">{t('auth.legalTerms')}</Link>
                        {' '}{t('auth.legalAnd')}{' '}
                        <Link to="/privacy" target="_blank" rel="noreferrer">{t('auth.legalPrivacy')}</Link>
                        .
                      </label>
                    </div>
                  )}

                  {showRegisterUi && mode === 'register' && (
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

                  <div className={mode === 'login' ? 'mb-2' : 'mb-3'}>
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

                  {!inviteOnly && mode === 'register' && (
                    <HCaptchaWidget
                      onToken={setCaptchaToken}
                      onExpire={() => setCaptchaToken('')}
                    />
                  )}

                  {mode === 'login' && (
                    <div className="mb-4 text-end">
                      <Link to="/forgot-password" className="small text-decoration-none" style={{ color: 'var(--ta-brown-light)' }}>
                        {t('auth.forgotPassword')}
                      </Link>
                    </div>
                  )}

                  <button type="submit" className="btn btn-dark w-100 py-2 fw-semibold" disabled={loading}>
                    {loading
                      ? t('auth.loading')
                      : inviteOnly && mode === 'login'
                        ? t('auth.betaLoginButton')
                        : mode === 'login'
                          ? t('auth.login')
                          : t('auth.register')}
                  </button>
                </form>

                {inviteOnly && (
                  <p className="small text-center mt-3 mb-0">
                    <Link to="/beta/apply" style={{ color: 'var(--ta-brown-light)' }}>{t('publicBetaHome.ctaApply')}</Link>
                  </p>
                )}

                {!inviteOnly && mode === 'login' && (
                <div className="mt-3">
                  <p className="small text-muted mb-2">{t('auth.orContinueWith')}</p>
                  {googleClientId ? (
                    <div ref={googleBtnRef} className="d-flex justify-content-center" />
                  ) : (
                    <p className="small text-muted mb-0">{t('auth.googlePendingConfig')}</p>
                  )}
                </div>
                )}

                {showRegisterUi && (
                <>
                <hr className="my-3" />
                <p className="small mb-0">
                  {mode === 'login' ? (
                    <>
                      {t('auth.noAccount')}{' '}
                      <button
                        className="btn btn-link btn-sm p-0 text-decoration-none"
                        style={{ color: 'var(--ta-brown)' }}
                        onClick={() => { setMode('register'); setError(''); setCaptchaToken('') }}
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
                        onClick={() => { setMode('login'); setError(''); setCaptchaToken('') }}
                      >
                        {t('auth.loginLink')}
                      </button>
                    </>
                  )}
                </p>
                </>
                )}
              </div>
                </section>
              </div>
            </div>

          {!inviteOnly && (
            <LoginFeaturedPartners />
          )}

          {/* Feature bullets */}
          <section className="w-100">
            <div className="row g-3 mb-3">
              {loginFeatureBlocks.map((block) => (
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
          </section>
          </div>
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
