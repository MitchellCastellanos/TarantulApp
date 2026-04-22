import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import publicApi from '../services/publicApi'
import ChitinCardFrame from '../components/ChitinCardFrame'
import { APP_LANGS, LOGIN_LANG_LABELS } from '../constants/languages'
import { appLangBase } from '../utils/appLanguage'
import authService from '../services/authService'
import BrandLogoMark from '../components/BrandLogoMark'
import Navbar from '../components/Navbar'

export default function LoginPage() {
  const { login, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const [mode, setMode] = useState(() =>
    location.state?.initialMode === 'register' ? 'register' : 'login'
  ) // 'login' | 'register'
  const [form, setForm] = useState({ email: '', password: '', displayName: '' })
  const [referralCode, setReferralCode] = useState(() => {
    const r = new URLSearchParams(location.search).get('ref')
    return r ? String(r).trim().toUpperCase() : ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const googleBtnRef = useRef(null)
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const loginRef = useRef(login)
  const tRef = useRef(t)
  loginRef.current = login
  tRef.current = t

  useEffect(() => {
    const r = searchParams.get('ref')
    if (r && String(r).trim()) {
      setReferralCode(String(r).trim().toUpperCase())
    }
  }, [searchParams])

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

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
      setError(
        import.meta.env.DEV && st
          ? `${baseMsg} (HTTP ${st})`
          : baseMsg
      )
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
              ref ? String(ref).trim().toUpperCase() : undefined
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
      if (window.google?.accounts?.id) {
        window.google.accounts.id.cancel()
      }
    }
  }, [googleClientId])

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ background: 'var(--ta-bg, #0f0e0c)' }}>
      <Navbar variant="public" hideLoginLink />
      <div className="flex-grow-1 d-flex align-items-center justify-content-center px-2 px-sm-3 py-3 py-lg-5">
      <ChitinCardFrame
        className="w-100"
        style={{ maxWidth: 'min(1020px, 100%)' }}
        showSilhouettes={false}
        variant="auth"
      >
      <div className="card border-0 bg-transparent shadow-none w-100">
        <div className="card-body p-3 p-md-4 p-lg-5">

          <div className="d-flex flex-column align-items-center mb-3 pb-2">
            <Link to="/login" className="text-decoration-none d-flex flex-column align-items-center gap-2">
              <BrandLogoMark size={64} showIntro />
              <span className="cinzel fw-semibold ta-login-brand-wordmark">TarantulApp</span>
            </Link>
          </div>

          <header className="text-center text-lg-start mb-3 mb-lg-4 px-lg-1">
            <p
              className="small mb-2 text-uppercase"
              style={{
                letterSpacing: '0.18em',
                color: 'var(--ta-text-muted)',
                fontSize: '0.65rem',
                fontWeight: 600,
              }}
            >
              {t('auth.standardEyebrow')}
            </p>
            <h2 className="fw-bold mb-1">{t('auth.loginTitle')}</h2>
            <p
              className="text-muted small mb-0 mx-auto mx-lg-0"
              style={{ maxWidth: 640, lineHeight: 1.45 }}
            >
              {mode === 'login' ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
            </p>
          </header>

          <div className="row g-4 g-lg-5 align-items-start align-items-lg-stretch">
            {/* Móvil: acción primero; escritorio: manifiesto a la izquierda */}
            <div className="col-12 col-lg-5 order-2 order-lg-1">
              <div
                className="px-3 py-3 px-lg-4 py-lg-4 rounded-2 small h-100"
                style={{
                  border: '1px solid rgba(200, 170, 80, 0.22)',
                  background: 'rgba(22, 18, 12, 0.35)',
                  color: 'var(--ta-parchment)',
                }}
              >
                <p className="fw-semibold mb-2 mb-lg-3" style={{ color: 'var(--ta-gold)', fontSize: '0.72rem', letterSpacing: '0.06em' }}>
                  {t('auth.standardManifestTitle')}
                </p>
                <p className="mb-2 mb-lg-3" style={{ opacity: 0.92, lineHeight: 1.55 }}>
                  {t('auth.standardManifestLead')}
                </p>
                <ul className="list-unstyled mb-2 mb-lg-3 small" style={{ opacity: 0.9, lineHeight: 1.55 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <li key={i} className="d-flex gap-2 mb-2">
                      <span aria-hidden="true" style={{ color: 'var(--ta-gold)', opacity: 0.45, flexShrink: 0 }}>·</span>
                      <span>{t(`auth.standardManifestB${i}`)}</span>
                    </li>
                  ))}
                </ul>
                <p className="fst-italic mb-2" style={{ fontSize: '0.78rem', opacity: 0.82, color: 'var(--ta-text-muted)', lineHeight: 1.5 }}>
                  {t('auth.standardCircleKicker')}
                </p>
                <p className="mb-0 small" style={{ lineHeight: 1.5 }}>
                  <Link to="/about" className="fw-semibold text-decoration-none" style={{ color: 'var(--ta-brown-light)' }}>
                    {t('auth.standardManifestAboutLink')}
                  </Link>
                  <span style={{ color: 'var(--ta-text-muted)', opacity: 0.9 }}> — {t('auth.standardManifestAboutHint')}</span>
                </p>
              </div>
            </div>

            <div className="col-12 col-lg-7 order-1 order-lg-2 d-flex flex-column h-100">
              <div className="d-flex flex-column gap-3 gap-lg-4 w-100 ms-lg-auto flex-grow-1" style={{ maxWidth: 560 }}>
          {error && (
            <div className="alert alert-danger py-2 small mb-0" role="alert">{error}</div>
          )}

          {mode === 'register' && (
            <div className="alert py-2 small mb-0"
                 style={{ background: 'rgba(200, 170, 80, 0.15)', border: '1px solid rgba(200, 170, 80, 0.45)', color: 'var(--ta-parchment)' }}>
              <span className="fw-semibold me-1">🎁</span>
              {t('auth.trialRegisterPromo')}
            </div>
          )}

          <div
            className="p-3 p-lg-4 rounded-2 small mb-0"
            style={{
              border: '1px solid rgba(200, 170, 80, 0.35)',
              background: 'rgba(30, 26, 18, 0.45)',
              color: 'var(--ta-parchment)',
            }}
          >
            <h3 className="h6 fw-bold mb-2" style={{ color: 'var(--ta-gold)' }}>{t('auth.proTeaserTitle')}</h3>
            <p className="mb-2" style={{ opacity: 0.95, lineHeight: 1.5 }}>
              <span className="fw-semibold" style={{ color: 'var(--ta-gold)' }}>{t('auth.proTeaserExcelLead')}</span>{' '}
              {t('auth.proTeaserBody')}
            </p>
            <Link to="/pro" className="small fw-semibold text-decoration-none" style={{ color: 'var(--ta-brown-light)' }}>
              {t('pro.learnMore')} →
            </Link>
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="mb-3">
                <label className="form-label fw-semibold small">{t('auth.name')}</label>
                <input type="text" name="displayName" className="form-control"
                       value={form.displayName} onChange={handleChange}
                       placeholder={t('auth.namePlaceholder')} autoComplete="name" />
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
              <input type="email" name="email" className="form-control" required
                     value={form.email} onChange={handleChange}
                     placeholder={t('auth.emailPlaceholder')} autoComplete="email" />
            </div>

            <div className={mode === 'login' ? 'mb-2' : 'mb-4'}>
              <label className="form-label fw-semibold small">{t('auth.password')}</label>
              <input type="password" name="password" className="form-control" required
                     value={form.password} onChange={handleChange}
                     placeholder={mode === 'register' ? t('auth.passwordPlaceholder') : ''}
                     autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </div>

            {mode === 'login' && (
              <div className="mb-4 text-end">
                <Link to="/forgot-password" className="small text-decoration-none"
                      style={{ color: 'var(--ta-brown-light)' }}>
                  {t('auth.forgotPassword')}
                </Link>
              </div>
            )}

            <button type="submit" className="btn btn-dark w-100 py-2 fw-semibold" disabled={loading}>
              {loading ? t('auth.loading') : mode === 'login' ? t('auth.login') : t('auth.register')}
            </button>
          </form>

          {(mode === 'login' || mode === 'register') && (
            <div className="mt-3">
              <p className="small text-muted mb-2">{t('auth.orContinueWith')}</p>
              {googleClientId ? (
                <div ref={googleBtnRef} className="d-flex justify-content-center justify-content-lg-start" />
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-outline-light w-100 py-2 fw-semibold"
                    disabled
                    title={t('auth.googlePendingConfig')}
                  >
                    Google
                  </button>
                  <p className="small text-muted mt-2 mb-0">{t('auth.googlePendingConfig')}</p>
                </>
              )}
            </div>
          )}

          <div
            className="mt-0 p-3 p-lg-4 rounded-2"
            style={{
              border: '1px solid rgba(200, 170, 80, 0.35)',
              background: 'rgba(30, 26, 18, 0.55)',
            }}
          >
            <h3 className="h6 fw-bold mb-2 ta-accent-heading">
              {t('discover.loginCtaTitle')}
            </h3>
            <p className="small mb-3" style={{ color: 'var(--ta-parchment)', opacity: 0.92, lineHeight: 1.5 }}>
              {t('discover.loginCtaBody')}
            </p>
            <button
              type="button"
              className="btn btn-sm w-100"
              style={{
                border: '1px solid var(--ta-gold)',
                color: '#1a1205',
                background: 'linear-gradient(135deg, #e8c56a 0%, #c9a227 100%)',
                fontWeight: 700,
              }}
              onClick={() => {
                logout()
                navigate('/descubrir', { replace: true })
              }}
            >
              {t('discover.loginCtaButton')}
            </button>
          </div>

          <hr className="my-3" />

          <p className="text-center text-lg-start small mb-0">
            {mode === 'login' ? (
              <>
                {t('auth.noAccount')}{' '}
                <button className="btn btn-link btn-sm p-0 text-decoration-none"
                        style={{ color: 'var(--ta-brown)' }}
                        onClick={() => { setMode('register'); setError('') }}>
                  {t('auth.registerLink')}
                </button>
              </>
            ) : (
              <>
                {t('auth.hasAccount')}{' '}
                <button className="btn btn-link btn-sm p-0 text-decoration-none"
                        style={{ color: 'var(--ta-brown)' }}
                        onClick={() => { setMode('login'); setError('') }}>
                  {t('auth.loginLink')}
                </button>
              </>
            )}
          </p>
          <p className="text-center text-lg-start small mt-3 mb-0">
            <Link to="/contact" className="text-decoration-none" style={{ color: 'var(--ta-brown-light)' }}>
              {t('nav.contact')}
            </Link>
          </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </ChitinCardFrame>
      </div>
    </div>
  )
}
