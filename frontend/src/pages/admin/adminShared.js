import { trialCalendarDaysRemaining } from '../../utils/trialDaysLeft'

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

/** Plan label: paid Pro vs Pro trial (Free + active trial) vs Free. */
export function formatAdminPlanSummary(u, t) {
  const plan = String(u?.plan || 'FREE').toUpperCase()
  const inTrial = u?.inTrial === true
  if (plan === 'PRO') {
    return t('admin.planSummaryPro')
  }
  if (inTrial) {
    const days = u?.trialEndsAt ? trialCalendarDaysRemaining(u.trialEndsAt) : 0
    if (days > 0) {
      return t('admin.planSummaryProTrialWithDays', { days })
    }
    return t('admin.planSummaryProTrial')
  }
  return t('admin.planSummaryFree')
}

/** Bootstrap badge color for plan column. */
export function adminPlanBadgeClass(u) {
  const plan = String(u?.plan || 'FREE').toUpperCase()
  if (plan === 'PRO') return 'primary'
  if (u?.inTrial === true) return 'info'
  return 'secondary'
}

/** Admin API may send camelCase or snake_case; always return a safe integer. */
export function adminSpiderCount(u) {
  const raw = u?.tarantulasCount ?? u?.tarantulas_count
  if (raw == null) return 0
  const n = Number(raw)
  return Number.isFinite(n) ? Math.trunc(n) : 0
}

function activitySortKey(iso) {
  if (iso == null || iso === '') return null
  const x = new Date(iso).getTime()
  return Number.isNaN(x) ? null : x
}

/**
 * Newest activity first; missing/invalid last; tie-break by createdAt desc.
 */
export function compareAdminByActivityDesc(a, b) {
  const sa = activitySortKey(a?.lastActivityAt)
  const sb = activitySortKey(b?.lastActivityAt)
  if (sa != null && sb != null && sa !== sb) return sb - sa
  if (sa != null && sb == null) return -1
  if (sa == null && sb != null) return 1
  const ca = activitySortKey(a?.createdAt) ?? 0
  const cb = activitySortKey(b?.createdAt) ?? 0
  return cb - ca
}

export function compareAdminByCreatedDesc(a, b) {
  const ca = activitySortKey(a?.createdAt)
  const cb = activitySortKey(b?.createdAt)
  if (ca != null && cb != null && ca !== cb) return cb - ca
  if (ca != null && cb == null) return -1
  if (ca == null && cb != null) return 1
  return compareAdminByActivityDesc(a, b)
}
