/** Filtros del catálogo Descubrir (misma idea que DiscoverCatalogService en backend). */

function norm(s) {
  return (s == null ? '' : String(s)).trim().toLowerCase()
}

function matchesSizeRange(sp, sizeMin, sizeMax) {
  const minRaw = sizeMin === '' || sizeMin == null ? null : Number(sizeMin)
  const maxRaw = sizeMax === '' || sizeMax == null ? null : Number(sizeMax)
  const minD = minRaw != null && Number.isFinite(minRaw) ? minRaw : null
  const maxD = maxRaw != null && Number.isFinite(maxRaw) ? maxRaw : null

  const cMin = sp.adultSizeCmMin != null ? Number(sp.adultSizeCmMin) : null
  const cMax = sp.adultSizeCmMax != null ? Number(sp.adultSizeCmMax) : null

  if (minD != null) {
    const passes =
      (cMax != null && cMax >= minD) ||
      (cMax == null && cMin != null && cMin >= minD) ||
      (cMax == null && cMin == null)
    if (!passes) return false
  }
  if (maxD != null) {
    const passes =
      (cMin != null && cMin <= maxD) ||
      (cMin == null && cMax != null && cMax <= maxD) ||
      (cMax == null && cMin == null)
    if (!passes) return false
  }
  return true
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {{ qCat: string, experienceLevel: string, habitatType: string, growthRate: string, sizeMin: string, sizeMax: string }} f
 */
export function filterDiscoverSpeciesRows(rows, f) {
  if (!Array.isArray(rows) || !rows.length) return []
  let out = rows
  const nq = (f.qCat || '').trim().toLowerCase()
  if (nq) {
    out = out.filter((s) => {
      const sn = (s.scientificName || '').toLowerCase()
      const cn = (s.commonName || '').toLowerCase()
      return sn.includes(nq) || cn.includes(nq)
    })
  }
  if (f.experienceLevel) {
    const v = f.experienceLevel.toLowerCase()
    out = out.filter((s) => norm(s.experienceLevel) === v)
  }
  if (f.habitatType) {
    const v = f.habitatType.toLowerCase()
    out = out.filter((s) => norm(s.habitatType) === v)
  }
  if (f.growthRate) {
    const v = f.growthRate.toLowerCase()
    out = out.filter((s) => norm(s.growthRate) === v)
  }
  out = out.filter((s) => matchesSizeRange(s, f.sizeMin, f.sizeMax))
  return out
}
