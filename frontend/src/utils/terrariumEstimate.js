const CM_PER_INCH = 2.54

function toUserUnit(cmValue, system) {
  if (system !== 'imperial') return cmValue
  // 1 decimal en pulgadas para conservar la sensación "ceil al entero" del cm,
  // pero sin perder precisión perceptible en terrarios chicos.
  return Math.ceil((cmValue / CM_PER_INCH) * 10) / 10
}

/**
 * Heurística de terrario con leg-span adaptable (no fijo 2x).
 * Terrestres incluyen sustrato y “headroom” (espacio sobre el sustrato al techo);
 * fosoriales corrigen profundidad de sustrato a rangos típicos (no DL×3 extremo).
 * @param {number|string|null|undefined} currentSizeCm
 * @param {{ habitatType?: string, adultSizeCmMax?: unknown }} species
 * @param {{ system?: 'metric'|'imperial' }} [options]
 * @returns {{ enclosureI18n: { key: string, params: Record<string, number|string> }, pct: number|null, adultSizeCmMax: unknown }|null}
 */
export function computeTerrariumRecommendation(currentSizeCm, species, options = {}) {
  const system = options.system === 'imperial' ? 'imperial' : 'metric'
  const unit = system === 'imperial' ? 'in' : 'cm'
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
    const w = toUserUnit(Math.ceil(legSpan * 1.5), system)
    const h = toUserUnit(Math.ceil(legSpan * 3), system)
    enclosureI18n = { key: 'terrarium.enclosureArboreal', params: { w, h, unit } }
  } else if (habitatType === 'fossorial') {
    const floor = toUserUnit(Math.ceil(legSpan * 2), system)
    // ~1–1.5× DL en coleo de hobby; techo alto sin sentido si el spider vive debajo del sustrato.
    const substrate = toUserUnit(Math.ceil(Math.min(45, Math.max(10, body * 1.25))), system)
    enclosureI18n = { key: 'terrarium.enclosureFossorial', params: { floor, substrate, unit } }
  } else {
    const floorCm = Math.ceil(legSpan * 2.5)
    const substrateCm = Math.ceil(Math.min(42, Math.max(8, body * 1.2)))
    // Espacio sobre el sustrato (no altura interior total): terrestres y semi-fossoriales típicamente poco más que su DL antes del tapa.
    const headroomCm = Math.ceil(Math.max(5, Math.min(18, body * 0.5)))
    const minHeightCm = substrateCm + headroomCm
    enclosureI18n = {
      key: 'terrarium.enclosureTerrestrial',
      params: {
        floor: toUserUnit(floorCm, system),
        substrate: toUserUnit(substrateCm, system),
        headroom: toUserUnit(headroomCm, system),
        minHeight: toUserUnit(minHeightCm, system),
        unit,
      },
    }
  }

  const pct = adultSizeCmMax
    ? Math.min(100, Math.round((body / Number(adultSizeCmMax)) * 100))
    : null

  return { enclosureI18n, pct, adultSizeCmMax }
}
