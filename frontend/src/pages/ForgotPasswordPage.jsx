import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import publicApi from '../services/publicApi'
import ChitinCardFrame from '../components/ChitinCardFrame'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await publicApi.post('/auth/forgot-password', { email })
      setSent(true)
    } catch {
      setError(t('common.error'))
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
          <div className="text-center mb-4">
            <div className="fs-1 mb-2">🔑</div>
            <h2 className="fw-bold mb-1">{t('auth.forgotPassword')}</h2>
          </div>

          {sent ? (
            <div className="alert alert-success text-center">
              {t('auth.resetSent')}
            </div>
          ) : (
            <>
              {error && <div className="alert alert-danger py-2 small">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="form-label fw-semibold small">{t('auth.email')}</label>
                  <input type="email" className="form-control" required
                         value={email} onChange={e => setEmail(e.target.value)}
                         placeholder={t('auth.emailPlaceholder')} />
                </div>
                <button type="submit" className="btn btn-dark w-100 py-2 fw-semibold" disabled={loading}>
                  {loading ? t('auth.loading') : t('auth.sendReset')}
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
      </ChitinCardFrame>
    </div>
  )
}
