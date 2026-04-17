import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import api from '../services/api'
import FangPanel from '../components/FangPanel'

const LANGS = [
  { code: 'es', flag: '🇲🇽', label: 'Español' },
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
]

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
    setLoading(true)
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register'
      const { data } = await api.post(endpoint, form)
      login(data)
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center"
         style={{ background: 'linear-gradient(135deg, #0c0c1e 0%, #06060e 100%)' }}>
      <FangPanel style={{ width: '100%', maxWidth: '420px' }}>
      <div className="card shadow-lg" style={{ width: '100%' }}>
        <div className="card-body p-4 p-md-5">

          {/* Language selector */}
          <div className="d-flex justify-content-end gap-2 mb-3">
            {LANGS.map(l => (
              <button
                key={l.code}
                title={l.label}
                onClick={() => i18n.changeLanguage(l.code)}
                className="btn btn-sm px-2 py-0"
                style={{
                  background: 'transparent',
                  border: i18n.language === l.code ? '1px solid var(--ta-gold)' : '1px solid var(--ta-border)',
                  color: i18n.language === l.code ? 'var(--ta-gold)' : 'var(--ta-text-muted)',
                  fontSize: '0.85rem',
                  borderRadius: 4,
                }}>
                {l.flag} {l.code.toUpperCase()}
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

          <form onSubmit={handleSubmit} noValidate>
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
      </FangPanel>
    </div>
  )
}
