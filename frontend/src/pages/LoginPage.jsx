import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import api from '../services/api'
import ChitinCardFrame from '../components/ChitinCardFrame'
import { APP_LANGS, LOGIN_LANG_LABELS } from '../constants/languages'
import { appLangBase } from '../utils/appLanguage'

export default function LoginPage() {
  const { login } = useAuth()
  const { t, i18n } = useTranslation()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [form, setForm] = useState({ email: '', password: '', displayName: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
        : { email, password, displayName: form.displayName?.trim() || undefined }
      const { data } = await api.post(endpoint, body)
      login(data)
    } catch (err) {
      const d = err.response?.data
      const fieldMsgs = d?.fields && typeof d.fields === 'object'
        ? Object.values(d.fields).filter(Boolean).join(' ')
        : ''
      setError(fieldMsgs || d?.error || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center px-3">
      <ChitinCardFrame
        className="w-100"
        style={{ maxWidth: 420 }}
        showSilhouettes={false}
        variant="auth"
      >
      <div className="card border-0 bg-transparent shadow-none w-100">
        <div className="card-body p-3 p-md-4">

          {/* Language selector — solo códigos ES / EN / FR (sin emojis: evita “GB” u otros glifos feos) */}
          <div className="d-flex justify-content-end gap-2 mb-3 pt-3 px-2">
            {APP_LANGS.map(l => (
              <button
                key={l.code}
                type="button"
                title={LOGIN_LANG_LABELS[l.code]}
                aria-label={LOGIN_LANG_LABELS[l.code]}
                onClick={() => i18n.changeLanguage(l.code)}
                className="btn btn-sm px-2 py-1"
                style={{
                  background: 'transparent',
                  border: appLangBase(i18n.language) === l.code ? '1px solid var(--ta-gold)' : '1px solid var(--ta-border)',
                  color: appLangBase(i18n.language) === l.code ? 'var(--ta-gold)' : 'var(--ta-text-muted)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  lineHeight: 1,
                  borderRadius: 4,
                }}>
                {l.display}
              </button>
            ))}
          </div>

          {/* Header */}
          <div className="text-center mb-4">
            <div className="fs-1 mb-2">🕷️</div>
            <h2 className="fw-bold mb-1">{t('auth.loginTitle')}</h2>
            <p className="text-muted small mb-0">
              {mode === 'login' ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
            </p>
          </div>

          {error && (
            <div className="alert alert-danger py-2 small" role="alert">{error}</div>
          )}

          {mode === 'register' && (
            <div className="alert py-2 small mb-3"
                 style={{ background: 'rgba(200, 170, 80, 0.15)', border: '1px solid rgba(200, 170, 80, 0.45)', color: 'var(--ta-parchment)' }}>
              <span className="fw-semibold me-1">🎁</span>
              {t('auth.trialRegisterPromo')}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="mb-3">
                <label className="form-label fw-semibold small">{t('auth.name')}</label>
                <input type="text" name="displayName" className="form-control"
                       value={form.displayName} onChange={handleChange}
                       placeholder={t('auth.namePlaceholder')} autoComplete="name" />
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

          <hr className="my-3" />

          <p className="text-center small mb-0">
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
        </div>
      </div>
      </ChitinCardFrame>
    </div>
  )
}
