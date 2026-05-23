import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function VerifiedVendorBadge({ className = '', showTooltip = false }) {
  const { t } = useTranslation()
  const badge = (
    <span
      className={`badge bg-success text-white ${className}`.trim()}
      title={showTooltip ? t('marketplace.verifiedVendorTooltip') : undefined}
    >
      {t('marketplace.verifiedBreederBadge')}
    </span>
  )
  if (showTooltip) {
    return (
      <span className="d-inline-flex align-items-center gap-1">
        {badge}
        <Link to="/legal/verified-vendors" className="small text-muted text-decoration-none">
          {t('marketplace.verifiedVendorLearnMore')}
        </Link>
      </span>
    )
  }
  return badge
}
