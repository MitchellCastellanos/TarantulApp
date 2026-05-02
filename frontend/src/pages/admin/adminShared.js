export const TESTER_TPL_PREF_KEY = 'tarantulapp_tester_email_tpl_v1'

export function loadTesterTplPrefs() {
  try {
    const s = localStorage.getItem(TESTER_TPL_PREF_KEY)
    const o = s ? JSON.parse(s) : {}
    return typeof o === 'object' && o !== null ? o : {}
  } catch {
    return {}
  }
}

export function formatUsageTime(lastActivityAt, t) {
  if (!lastActivityAt) return t('admin.usageTimeNever')
  const ts = new Date(lastActivityAt).getTime()
  if (Number.isNaN(ts)) return '-'
  const diffMs = Math.max(0, Date.now() - ts)
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return t('admin.usageTimeNow')
  if (minutes < 60) return t('admin.usageTimeMinutes', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('admin.usageTimeHours', { count: hours })
  const days = Math.floor(hours / 24)
  return t('admin.usageTimeDays', { count: days })
}

/** @returns {'never' | 'active' | 'seen'} */
export function userActivityTier(lastActivityAt) {
  if (!lastActivityAt) return 'never'
  const ts = new Date(lastActivityAt).getTime()
  if (Number.isNaN(ts)) return 'never'
  const days = (Date.now() - ts) / 86400000
  if (days <= 7) return 'active'
  return 'seen'
}

export function activityStatusLabel(tier, t) {
  if (tier === 'active') return t('admin.activityStatusActive')
  if (tier === 'seen') return t('admin.activityStatusSeen')
  return t('admin.activityStatusNever')
}

export function activityStatusBadgeClass(tier) {
  if (tier === 'active') return 'success'
  if (tier === 'seen') return 'secondary'
  return 'warning'
}
