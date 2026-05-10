/** Emoji accent for marketplace keeper badges (API badge keys). */
export function keeperBadgeEmoji(iconKey) {
  const k = String(iconKey || '').toLowerCase()
  if (k.includes('starter')) return '🌱'
  if (k.includes('collection') && (k.includes('25') || k.includes('plus'))) return '📚'
  if (k.includes('collection')) return '📗'
  if (k.includes('diversity') || k.includes('species')) return '🧬'
  if (k.includes('verified')) return '✅'
  if (k.includes('seller') || k.includes('vendor') || k.includes('listing')) return '🏪'
  return '🏅'
}
