import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function kindLabel(kind, t) {
  if (!kind) return ''
  return t(`verifiedOrigin.kind.${kind.toLowerCase()}`, kind)
}

/**
 * Public Verified Origin trust badge (separate from Official Partner).
 */
export default function VerifiedOriginBadge({ origin, className = '', showTooltip = false, verified }) {
  const { t } = useTranslation()
  const isVerified = origin?.verified === true || verified === true
  if (!isVerified) return null

  const kind = origin?.kind
  const label = t('verifiedOrigin.badge')
  const tooltip = showTooltip
    ? t('verifiedOrigin.tooltip', {
        kind: kindLabel(kind, t),
        name: origin?.displayName || '',
      })
    : undefined

  const badge = (
    <span
      className={`badge bg-success text-white ${className}`.trim()}
      title={tooltip}
    >
      {label}
      {kind ? ` · ${kindLabel(kind, t)}` : ''}
    </span>
  )

  if (showTooltip) {
    return (
      <span className="d-inline-flex align-items-center gap-1 flex-wrap">
        {badge}
        <Link to="/legal/verified-vendors" className="small text-muted text-decoration-none">
          {t('verifiedOrigin.learnMore')}
        </Link>
      </span>
    )
  }
  return badge
}
