/**
 * Heurística de terrario alineada con {@link ../pages/TarantulaDetailPage} (leg span ≈ 2× cuerpo).
 * @param {number|string|null|undefined} currentSizeCm
 * @param {{ habitatType?: string, adultSizeCmMax?: unknown }} species
 * @returns {{ enclosureI18n: { key: string, params: Record<string, number> }, pct: number|null, adultSizeCmMax: unknown }|null}
 */
export function computeTerrariumRecommendation(currentSizeCm, species) {
  if (currentSizeCm == null || currentSizeCm === '' || !species) return null
  const body = Number(currentSizeCm)
  if (!Number.isFinite(body) || body <= 0) return null

  const legSpan = body * 2
  const { habitatType, adultSizeCmMax } = species

  let enclosureI18n
  if (habitatType === 'arboreal') {
    const w = Math.ceil(legSpan * 1.5)
    const h = Math.ceil(legSpan * 3)
    enclosureI18n = { key: 'terrarium.enclosureArboreal', params: { w, h } }
  } else if (habitatType === 'fossorial') {
    const floor = Math.ceil(legSpan * 2)
    const substrate = Math.ceil(body * 3)
    enclosureI18n = { key: 'terrarium.enclosureFossorial', params: { floor, substrate } }
  } else {
    const floor = Math.ceil(legSpan * 2.5)
    const height = Math.ceil(legSpan * 1.2)
    enclosureI18n = { key: 'terrarium.enclosureTerrestrial', params: { floor, height } }
  }

  const pct = adultSizeCmMax
    ? Math.min(100, Math.round((body / Number(adultSizeCmMax)) * 100))
    : null

  return { enclosureI18n, pct, adultSizeCmMax }
}
