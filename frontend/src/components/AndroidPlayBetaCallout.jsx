import { useTranslation } from 'react-i18next'
import { useOpenPlayStore } from '../context/PlayStoreGateContext'

/**
 * Short notice: Android build is on Play (closed testing). Shown on public beta home and beta login.
 */
export default function AndroidPlayBetaCallout({ className = '' }) {
  const { t } = useTranslation()
  const openPlayStore = useOpenPlayStore()
  return (
    <div
      className={`rounded-3 p-3 mb-0 ${className}`}
      style={{
        border: '1px solid rgba(66, 133, 244, 0.45)',
        background: 'linear-gradient(135deg, rgba(20, 40, 80, 0.22) 0%, rgba(12, 18, 28, 0.5) 100%)',
      }}
    >
      <p className="small text-uppercase mb-1" style={{ letterSpacing: '0.1em', color: 'var(--ta-text-muted)' }}>
        {t('publicBetaHome.playStoreBadge')}
      </p>
      <p className="small fw-semibold mb-1" style={{ color: 'var(--ta-parchment)' }}>
        {t('publicBetaHome.playStoreTitle')}
      </p>
      <p className="small mb-2" style={{ color: 'var(--ta-text-muted)', lineHeight: 1.55 }}>
        {t('publicBetaHome.playStoreBody')}
      </p>
      <button
        type="button"
        onClick={() => openPlayStore()}
        className="btn btn-sm btn-outline-warning fw-semibold"
      >
        {t('publicBetaHome.playStoreCta')}
      </button>
    </div>
  )
}
