/**
 * Heurística de terrario con leg-span adaptable (no fijo 2x).
 * Terrestres incluyen sustrato y “headroom” (espacio sobre el sustrato al techo);
 * fosoriales corrigen profundidad de sustrato a rangos típicos (no DL×3 extremo).
 * @param {number|string|null|undefined} currentSizeCm
 * @param {{ habitatType?: string, adultSizeCmMax?: unknown }} species
 * @returns {{ enclosureI18n: { key: string, params: Record<string, number> }, pct: number|null, adultSizeCmMax: unknown }|null}
 */
export function computeTerrariumRecommendation(currentSizeCm, species) {
  if (currentSizeCm == null || currentSizeCm === '' || !species) return null
  const body = Number(currentSizeCm)
  if (!Number.isFinite(body) || body <= 0) return null

  const { habitatType, adultSizeCmMax } = species
  const adultMax = Number(adultSizeCmMax)
  const hasAdultMax = Number.isFinite(adultMax) && adultMax > 0

  const legSpanFactor = hasAdultMax
    ? (() => {
      const ratioToAdult = body / adultMax
      if (ratioToAdult >= 0.55) return 1.1
      if (ratioToAdult >= 0.35) return 1.4
      return 1.8
    })()
    : (() => {
      if (body >= 10) return 1.2
      if (body >= 6) return 1.5
      return 2
    })()
  const legSpan = body * legSpanFactor

  let enclosureI18n
  if (habitatType === 'arboreal') {
    const w = Math.ceil(legSpan * 1.5)
    const h = Math.ceil(legSpan * 3)
    enclosureI18n = { key: 'terrarium.enclosureArboreal', params: { w, h } }
  } else if (habitatType === 'fossorial') {
    const floor = Math.ceil(legSpan * 2)
    // ~1–1.5× DL en coleo de hobby; techo alto sin sentido si el spider vive debajo del sustrato.
    const substrate = Math.ceil(Math.min(45, Math.max(10, body * 1.25)))
    enclosureI18n = { key: 'terrarium.enclosureFossorial', params: { floor, substrate } }
  } else {
    const floor = Math.ceil(legSpan * 2.5)
    const substrate = Math.ceil(Math.min(42, Math.max(8, body * 1.2)))
    // Espacio sobre el sustrato (no altura interior total): terrestres y semi-fossoriales típicamente poco más que su DL antes del tapa.
    const headroom = Math.ceil(Math.max(5, Math.min(18, body * 0.5)))
    const minHeight = substrate + headroom
    enclosureI18n = { key: 'terrarium.enclosureTerrestrial', params: { floor, substrate, headroom, minHeight } }
  }

  const pct = adultSizeCmMax
    ? Math.min(100, Math.round((body / Number(adultSizeCmMax)) * 100))
    : null

  return { enclosureI18n, pct, adultSizeCmMax }
}
