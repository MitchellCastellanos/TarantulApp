/**
 * Emoji accent for marketplace keeper badges (API badge keys).
 * Order matters: first match wins (most specific patterns first).
 */
const BADGE_RULES = [
  [/^starter|^fallback_start/, '🌱'],
  [/^collection_50|^colossus/, '🏛️'],
  [/^collection_25|^fallback_c25/, '📚'],
  [/^collection_10|^fallback_c10|^collection_5/, '📗'],
  [/^species_20/, '🧪'],
  [/^species_|^fallback_d/, '🧬'],
  [/^logger_300/, '📜'],
  [/^logger_100|^logger_30/, '📓'],
  [/^molt_100/, '🔭'],
  [/^molt_40/, '🕷️'],
  [/^molt_/, '🛡️'],
  [/^feed_300/, '⚡'],
  [/^feed_100/, '🍽️'],
  [/^feed_/, '🪲'],
  [/^qr_printed_25/, '🏷️'],
  [/^qr_printed_10/, '🖨️'],
  [/^qr_/, '📎'],
  [/^seller_listed_15/, '🌆'],
  [/^seller_listed_5/, '🏪'],
  [/^seller_listed/, '🛒'],
  [/^seller_reviewed_5/, '⭐'],
  [/^seller_reviewed/, '💬'],
  [/^genus_lineup_6/, '🧬'],
  [/^genus_lineup/, '🔬'],
  [/^genera_breadth_12/, '🗺️'],
  [/^genera_breadth/, '🌐'],
  [/^worlds_bridge/, '🌗'],
  [/^old_world_line_12/, '🏺'],
  [/^old_world/, '🕌'],
  [/^new_world_line_12/, '🦜'],
  [/^new_world/, '🌎'],
  [/^habitat_trio/, '🎭'],
  [/^habitat_/, '🗻'],
  [/^sling_den_25/, '👶'],
  [/^sling_den/, '🐣'],
  [/^giants_row/, '🦣'],
  [/^heavyweight/, '⚓'],
  [/^tenure_5y/, '⏳'],
  [/^tenure_/, '📅'],
  [/^sex_poll_50/, '🗳️'],
  [/^sex_poll/, '🎯'],
  [/^badge_track|^max$/, '✨'],
]

export function keeperBadgeEmoji(iconKey) {
  const k = String(iconKey || '').toLowerCase()
  for (const [re, emoji] of BADGE_RULES) {
    if (re.test(k)) return emoji
  }
  return '🏅'
}
