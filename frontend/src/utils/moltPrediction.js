// Average days between molts by species growth rate and life stage (rough bands).
const MOLT_INTERVAL_DAYS = {
  fast: { sling: [45, 75], juvenile: [60, 90], subadult: [90, 150], adult: [180, 365] },
  moderate: { sling: [60, 90], juvenile: [90, 150], subadult: [120, 210], adult: [270, 480] },
  medium: { sling: [60, 90], juvenile: [90, 150], subadult: [120, 210], adult: [270, 480] },
  slow: { sling: [90, 150], juvenile: [150, 270], subadult: [270, 420], adult: [480, 730] },
  low: { sling: [90, 150], juvenile: [150, 270], subadult: [270, 420], adult: [480, 730] },
}
const FALLBACK_INTERVAL = [120, 365]

/** @returns {{ earliest: Date, latest: Date } | null} */
export function predictNextMolt(lastMoltAt, growthRate, stage) {
  if (!lastMoltAt) return null
  const molt = new Date(lastMoltAt)
  const rate = growthRate?.toLowerCase?.()
  const stg = stage?.toLowerCase?.()
  const [minDays, maxDays] = MOLT_INTERVAL_DAYS[rate]?.[stg] ?? FALLBACK_INTERVAL
  return {
    earliest: new Date(molt.getTime() + minDays * 86_400_000),
    latest: new Date(molt.getTime() + maxDays * 86_400_000),
  }
}
