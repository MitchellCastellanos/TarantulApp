/** Labels for keeper rank API keys (beginner | intermediate | expert | breeder). */
export function keeperRankName(t, key) {
  if (!key || key === 'Max' || key === 'none') return ''
  return t(`marketplace.keeperRank.${key}`, { defaultValue: key })
}
