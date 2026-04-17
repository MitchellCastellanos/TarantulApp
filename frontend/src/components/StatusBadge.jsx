import { useTranslation } from 'react-i18next'

const STATUS_COLORS = {
  active: 'success',
  pre_molt: 'warning',
  pending_feeding: 'danger',
  deceased: 'secondary',
}

export default function StatusBadge({ status }) {
  const { t } = useTranslation()
  const color = STATUS_COLORS[status] ?? 'secondary'
  const labelKey = status && t(`status.${status}`, { defaultValue: '' })
  const label = labelKey || status || '–'
  return (
    <span className={`badge bg-${color} text-${color === 'warning' ? 'dark' : 'white'}`}>
      {label}
    </span>
  )
}
