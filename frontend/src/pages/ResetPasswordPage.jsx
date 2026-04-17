import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import FangPanel from '../components/FangPanel'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) { setError(t('auth.passwordMismatch')); return }
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/reset-password', { token, password })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
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
          <div className="text-center mb-4">
            <div className="fs-1 mb-2">🔒</div>
            <h2 className="fw-bold mb-1">{t('auth.resetTitle')}</h2>
            <p className="text-muted small mb-0">{t('auth.resetSubtitle')}</p>
          </div>

          {success ? (
            <div className="alert alert-success text-center">
              {t('auth.resetSuccess')}
            </div>
          ) : (
            <>
              {error && <div className="alert alert-danger py-2 small">{error}</div>}
              {!token && (
                <div className="alert alert-warning py-2 small">
                  Token inválido. Solicita un nuevo enlace.
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-semibold small">{t('auth.newPassword')}</label>
                  <input type="password" className="form-control" required minLength={6}
                         value={password} onChange={e => setPassword(e.target.value)}
                         placeholder={t('auth.passwordPlaceholder')} />
                </div>
                <div className="mb-4">
                  <label className="form-label fw-semibold small">{t('auth.confirmPassword')}</label>
                  <input type="password" className="form-control" required
                         value={confirm} onChange={e => setConfirm(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-dark w-100 py-2 fw-semibold"
                        disabled={loading || !token}>
                  {loading ? t('auth.loading') : t('auth.resetPassword')}
                </button>
              </form>
            </>
          )}

          <hr className="my-3" />
          <p className="text-center small mb-0">
            <Link to="/login" style={{ color: 'var(--ta-brown)' }}>{t('auth.backToLogin')}</Link>
          </p>
        </div>
      </div>
      </FangPanel>
    </div>
  )
}
