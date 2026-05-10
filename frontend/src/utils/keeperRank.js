/** Labels for keeper rank API keys (beginner | intermediate | expert | breeder). */
export function keeperRankName(t, key) {
  if (!key || key === 'none') return ''
  if (key === 'Max') {
    return t('marketplace.keeperRank.top', { defaultValue: 'Top tier' })
  }
  return t(`marketplace.keeperRank.${key}`, { defaultValue: key })
}
