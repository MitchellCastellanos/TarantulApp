const CONSECUTIVE_REJECTION_THRESHOLD = 2

/** @param {Array<{ accepted?: boolean }>|null|undefined} feedings — newest first */
export function detectFeedingPreMoltSignal(feedings) {
  if (!feedings || feedings.length < CONSECUTIVE_REJECTION_THRESHOLD) return false
  const recent = feedings.slice(0, CONSECUTIVE_REJECTION_THRESHOLD)
  return recent.every((f) => f.accepted === false)
}
