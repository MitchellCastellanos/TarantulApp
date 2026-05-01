import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import authService from '../services/authService'

export default function BetaTesterAgreementModal() {
  const { t } = useTranslation()
  const { token, user, login } = useAuth()
  const [acceptedRead, setAcceptedRead] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const needsGate =
    !!token &&
    user?.betaTester === true &&
    !user?.betaAgreementAcceptedAt

  if (!needsGate) {
    return null
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!acceptedRead) {
      setError(t('beta.agreementNeedCheckbox'))
      return
    }
    setBusy(true)
    try {
      const data = await authService.acceptBetaAgreement(true)
      login(data)
    } catch (err) {
      setError(err?.response?.data?.message || t('beta.agreementError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="modal show d-block"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="beta-agreement-title"
      style={{ background: 'rgba(0,0,0,0.55)', zIndex: 1080 }}
    >
      <div className="modal-dialog modal-dialog-scrollable modal-lg">
        <div className="modal-content ta-premium-pane border-secondary border-opacity-25">
          <div className="modal-header border-secondary border-opacity-25">
            <h2 id="beta-agreement-title" className="modal-title h5">
              {t('beta.agreementTitle')}
            </h2>
          </div>
          <form onSubmit={onSubmit}>
            <div className="modal-body">
              <p className="small mb-2">{t('beta.agreementIntro')}</p>
              <div
                className="rounded border border-secondary border-opacity-25 p-3 mb-3 small"
                style={{ maxHeight: 280, overflowY: 'auto', background: 'var(--ta-bg-elevated, #111)' }}
              >
                <ul className="mb-0 ps-3">
                  <li className="mb-2">{t('beta.agreementBullet1')}</li>
                  <li className="mb-2">{t('beta.agreementBullet2')}</li>
                  <li className="mb-2">{t('beta.agreementBullet3')}</li>
                  <li className="mb-0">{t('beta.agreementBullet4')}</li>
                </ul>
              </div>
              <div className="form-check mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="beta-agreement-check"
                  checked={acceptedRead}
                  onChange={(e) => setAcceptedRead(e.target.checked)}
                />
                <label className="form-check-label small" htmlFor="beta-agreement-check">
                  {t('beta.agreementCheckbox')}
                </label>
              </div>
              {error ? <div className="alert alert-danger small py-2 mb-0">{error}</div> : null}
            </div>
            <div className="modal-footer border-secondary border-opacity-25">
              <button type="submit" className="btn btn-warning" disabled={busy}>
                {busy ? t('common.loading') : t('beta.agreementSubmit')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
