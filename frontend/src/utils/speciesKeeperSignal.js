/**
 * Mirrors backend {@code DiscoverCatalogService#keeperGradeProfileSpecification} closely enough
 * for honest UI: “indexed name” vs “keeper-grade signal” without an extra API round-trip.
 */
export function hasKeeperGradeSignal(species) {
  if (!species || typeof species !== 'object') return false
  if (species.dataSource === 'seed') return true
  if (species.careProfileSource) return true
  const notes = typeof species.careNotes === 'string' && species.careNotes.trim().length > 8
  const nar = typeof species.narrativeI18n === 'string' && species.narrativeI18n.trim().length > 8
  const hm = species.humidityMin != null && species.humidityMax != null
  return notes || nar || hm
}
