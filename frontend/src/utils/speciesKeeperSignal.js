/**
 * Prefer {@code species.hasKeeperGradeProfile} from the API when present; otherwise mirror backend
 * {@link SpeciesKeeperProfileSignals} for stale caches or legacy payloads.
 */
export function hasKeeperGradeSignal(species) {
  if (!species || typeof species !== 'object') return false
  if (species.hasKeeperGradeProfile === true) return true
  if (species.hasKeeperGradeProfile === false) return false
  if (species.dataSource === 'seed') return true
  if (species.careProfileSource) return true
  const notes = typeof species.careNotes === 'string' && species.careNotes.trim().length > 8
  const nar = typeof species.narrativeI18n === 'string' && species.narrativeI18n.trim().length > 8
  const hm = species.humidityMin != null && species.humidityMax != null
  return notes || nar || hm
}
