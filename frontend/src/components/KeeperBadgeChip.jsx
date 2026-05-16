import { keeperBadgeEmoji } from '../utils/keeperBadgeIcons'

const TIERS = new Set(['core', 'notable', 'elite'])

export default function KeeperBadgeChip({ iconKey, label, tier = 'core', className = '' }) {
  const safeTier = TIERS.has(tier) ? tier : 'core'
  const emoji = keeperBadgeEmoji(iconKey)
  return (
    <span
      className={`ta-keeper-badge-chip ta-keeper-badge-chip--${safeTier} ${className}`.trim()}
      title={label}
    >
      <span className="ta-keeper-badge-chip__glyph" aria-hidden="true">
        {emoji}
      </span>
      <span className="ta-keeper-badge-chip__label">{label}</span>
    </span>
  )
}
