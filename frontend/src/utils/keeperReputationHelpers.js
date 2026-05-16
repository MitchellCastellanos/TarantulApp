/** Helpers for keeper reputation axes + badge progress copy (marketplace profile). */

export function reputationAxisLabel(t, key) {
  if (!key) return ''
  return t(`marketplace.reputationAxis.${key}`, { defaultValue: key })
}

export function isBadgeTrackComplete(progress) {
  const k = progress?.nextKey
  return k === 'badge_track_complete' || k === 'max'
}

export function badgeProgressTitle(t, progress) {
  const key = progress?.nextKey
  if (!key) return progress?.nextLabel || ''
  if (isBadgeTrackComplete(progress)) {
    return t('marketplace.badges.badge_track_complete', {
      defaultValue: progress?.nextLabel || '',
    })
  }
  return t(`marketplace.badges.${key}`, { defaultValue: progress?.nextLabel || key })
}

export function badgeProgressHintLine(t, trackKey, progress) {
  if (!trackKey || !progress) return ''
  const current = Number(progress?.current ?? 0)
  if (isBadgeTrackComplete(progress)) {
    return t(`marketplace.badgeProgressHint.${trackKey}_complete`, {
      current,
      defaultValue: '',
    })
  }
  const target = Number(progress?.target ?? 0)
  const needed = Math.max(0, target - current)
  return t(`marketplace.badgeProgressHint.${trackKey}`, {
    current,
    target,
    needed,
    defaultValue: '',
  })
}
