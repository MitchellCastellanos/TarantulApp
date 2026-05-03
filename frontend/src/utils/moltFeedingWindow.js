// Days to wait before feeding after a molt, by life stage.
const WAIT_DAYS_BY_STAGE = {
  sling: 7,
  juvenile: 10,
  subadult: 14,
  adult: 21,
}
const DEFAULT_WAIT_DAYS = 14

export function postMoltFeedingWindowDays(stage) {
  return WAIT_DAYS_BY_STAGE[stage] ?? DEFAULT_WAIT_DAYS
}

/** @returns {{ safeDate: Date, daysLeft: number, isActive: boolean } | null} */
export function computePostMoltWindow(lastMoltAt, stage) {
  if (!lastMoltAt) return null
  const molt = new Date(lastMoltAt)
  const waitDays = postMoltFeedingWindowDays(stage)
  const safeDate = new Date(molt.getTime() + waitDays * 86_400_000)
  const now = new Date()
  const daysLeft = Math.ceil((safeDate - now) / 86_400_000)
  return { safeDate, daysLeft, isActive: daysLeft > 0 }
}
