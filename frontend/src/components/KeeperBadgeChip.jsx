import { keeperBadgeEmoji } from '../utils/keeperBadgeIcons'

const TIERS = new Set(['core', 'notable', 'elite'])

export default function KeeperBadgeChip({ iconKey, label, tier = 'core', iconOnly = false, className = '' }) {
  const safeTier = TIERS.has(tier) ? tier : 'core'
  const emoji = keeperBadgeEmoji(iconKey)
  const chipClass = `ta-keeper-badge-chip ta-keeper-badge-chip--${safeTier}${iconOnly ? ' ta-keeper-badge-chip--icon-only' : ''}${className ? ` ${className}` : ''}`
  return (
    <span className={chipClass} title={label} aria-label={iconOnly ? label : undefined}>
      <span className="ta-keeper-badge-chip__glyph" aria-hidden="true">
        {emoji}
      </span>
      {!iconOnly && <span className="ta-keeper-badge-chip__label">{label}</span>}
    </span>
  )
}
