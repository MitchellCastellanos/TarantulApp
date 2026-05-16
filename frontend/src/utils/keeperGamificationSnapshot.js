/** @typedef {{ v: number, badgeKeys: string[], reputationTier: string, reputationScore: number, progress: Record<string, { nextKey: string }> }} KeeperGamificationSnapshot */

const SNAPSHOT_VERSION = 1

const RANK_ORDER = {
  beginner: 0,
  intermediate: 1,
  expert: 2,
  breeder: 3,
}

export function keeperGamificationStorageKey(userId) {
  return `ta_keeper_gamification_v${SNAPSHOT_VERSION}_${String(userId)}`
}

/**
 * @param {Record<string, unknown>|null|undefined} profile — API payload from getMyProfile
 * @returns {KeeperGamificationSnapshot|null}
 */
export function buildKeeperGamificationSnapshot(profile) {
  if (!profile || typeof profile !== 'object') return null
  const badges = Array.isArray(profile.badges) ? profile.badges : []
  const badgeKeys = [...new Set(badges.map((b) => b?.key).filter(Boolean).map(String))].sort()
  const rep = profile.reputation && typeof profile.reputation === 'object' ? profile.reputation : {}
  const tier = rep.tier != null ? String(rep.tier) : ''
  const score = Number(rep.score ?? 0)
  const progress = {}
  const bp = profile.badgesProgress && typeof profile.badgesProgress === 'object' ? profile.badgesProgress : {}
  for (const [trackKey, v] of Object.entries(bp)) {
    if (v && typeof v === 'object' && v.nextKey != null) {
      progress[trackKey] = { nextKey: String(v.nextKey) }
    }
  }
  return {
    v: SNAPSHOT_VERSION,
    badgeKeys,
    reputationTier: tier,
    reputationScore: Number.isFinite(score) ? score : 0,
    progress,
  }
}

/**
 * @param {KeeperGamificationSnapshot|null} prev
 * @param {KeeperGamificationSnapshot|null} curr
 */
export function diffKeeperGamification(prev, curr) {
  if (!curr) return { events: [], isBaseline: true }
  if (!prev || !Array.isArray(prev.badgeKeys)) {
    return { events: [], isBaseline: true }
  }

  /** @type {Array<{ type: string, [k: string]: unknown }>} */
  const events = []

  const prevTierOrder = RANK_ORDER[prev.reputationTier] ?? -1
  const currTierOrder = RANK_ORDER[curr.reputationTier] ?? -1
  if (curr.reputationTier && currTierOrder > prevTierOrder) {
    events.push({ type: 'rep_tier_up', tier: curr.reputationTier })
  } else if (prev.reputationTier === curr.reputationTier && curr.reputationTier) {
    const milestones = [25, 50, 75, 100]
    for (const m of milestones) {
      if (prev.reputationScore < m && curr.reputationScore >= m) {
        events.push({ type: 'rep_milestone', tier: curr.reputationTier, milestone: m })
      }
    }
  }

  const prevKeys = new Set(prev.badgeKeys)
  for (const key of curr.badgeKeys) {
    if (!prevKeys.has(key)) {
      events.push({ type: 'badge_new', badgeKey: key })
    }
  }

  const currProg = curr.progress || {}
  const prevProg = prev.progress || {}
  for (const trackKey of Object.keys(currProg)) {
    const pn = prevProg[trackKey]?.nextKey
    const cn = currProg[trackKey]?.nextKey
    if (pn && cn && cn !== pn) {
      events.push({ type: 'track_step', trackKey })
    }
  }

  const ORDER = { rep_tier_up: 0, rep_milestone: 1, badge_new: 2, track_step: 3 }
  events.sort((a, b) => (ORDER[a.type] ?? 9) - (ORDER[b.type] ?? 9))

  return { events, isBaseline: false }
}
