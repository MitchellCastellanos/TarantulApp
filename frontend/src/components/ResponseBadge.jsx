import { useTranslation } from 'react-i18next'

export default function ResponseBadge({ badge, avgResponseHours, className = '' }) {
  const { t } = useTranslation()
  if (!badge) return null
  const labelKey = `marketplace.responseBadge.${badge}`
  const label = t(labelKey, { defaultValue: badge })
  const tooltip = avgResponseHours != null
    ? t('marketplace.responseBadge.tooltip', { hours: avgResponseHours })
    : t('marketplace.responseBadge.tooltipGeneric')
  return (
    <span
      className={`badge bg-dark text-success border border-success ${className}`.trim()}
      title={tooltip}
    >
      {label}
    </span>
  )
}
