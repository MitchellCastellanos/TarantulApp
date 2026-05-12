import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOpenPlayStore } from '../context/PlayStoreGateContext'

/**
 * Login column: explain Play early access + account → tester list + install.
 */
export default function PlayStoreEarlyAccessCallout({ className = '', inviteOnly = false, onGoRegister }) {
  const { t } = useTranslation()
  const { token } = useAuth()
  const openPlayStore = useOpenPlayStore()
  const bodyKey = inviteOnly ? 'playStore.calloutBodyInviteOnly' : 'playStore.calloutBody'

  return (
    <div
      className={`rounded-3 p-3 mb-0 ${className}`}
      style={{
        border: '1px solid rgba(52, 168, 83, 0.5)',
        background: 'linear-gradient(135deg, rgba(20, 60, 40, 0.25) 0%, rgba(10, 24, 18, 0.45) 100%)',
      }}
    >
      <p className="small text-uppercase mb-1" style={{ letterSpacing: '0.08em', color: 'var(--ta-text-muted)' }}>
        {t('playStore.calloutBadge')}
      </p>
      <p className="small fw-semibold mb-1" style={{ color: 'var(--ta-parchment)' }}>
        {t('playStore.calloutTitle')}
      </p>
      <p className="small mb-2" style={{ color: 'var(--ta-text-muted)', lineHeight: 1.6 }}>
        {t(bodyKey)}
      </p>
      <p
        className="small mb-2 mb-md-3"
        style={{ color: 'var(--ta-text-muted)', lineHeight: 1.5, opacity: 0.88, fontSize: '0.78rem' }}
      >
        {t('playStore.playGoogleAccountTip')}
      </p>
      <div className="d-flex flex-wrap align-items-center gap-2">
        <button
          type="button"
          onClick={() => openPlayStore()}
          className="btn btn-sm btn-success fw-semibold"
        >
          {t('playStore.webBannerGetApp')}
        </button>
        {!token && !inviteOnly && onGoRegister && (
          <button type="button" className="btn btn-sm btn-outline-light fw-semibold" onClick={onGoRegister}>
            {t('playStore.calloutCreateAccount')}
          </button>
        )}
        {!token && !inviteOnly && !onGoRegister && (
          <Link
            to="/login"
            state={{ initialMode: 'register' }}
            className="btn btn-sm btn-outline-light fw-semibold"
          >
            {t('playStore.calloutCreateAccount')}
          </Link>
        )}
        {token && (
          <span className="small" style={{ color: 'var(--ta-gold, #d4af37)' }}>
            {t('playStore.calloutSignedInHint')}
          </span>
        )}
      </div>
    </div>
  )
}
