/**
 * Misma cadena que “Agregar tarántula”: WSC + GBIF vía {@link speciesService} (GET /api/wsc/search, /api/gbif/search).
 */

import speciesService from '../services/speciesService'

function parseGbifKeyFromWsc(taxonId) {
  if (taxonId == null) return null
  const n = Number(String(taxonId).trim())
  return Number.isFinite(n) ? n : null
}

function isTheraphosidaeRow(row) {
  const fam = (row?.family || '').trim().toLowerCase()
  if (!fam) return false
  return fam === 'theraphosidae' || fam.includes('theraphosidae')
}

export async function fetchDiscoverTaxonomyHits(q) {
  const trimmed = (q || '').trim()
  if (trimmed.length < 2) return []

  const [wsc, gbif] = await Promise.all([
    speciesService.searchWsc(trimmed).catch(() => []),
    speciesService.searchGbif(trimmed).catch(() => []),
  ])

  const byKey = new Map()

  for (const row of Array.isArray(wsc) ? wsc : []) {
    const key = parseGbifKeyFromWsc(row.taxonId)
    if (key == null) continue
    byKey.set(key, {
      source: 'wsc',
      gbifKey: key,
      canonicalName: row.name || '',
      family: row.family || undefined,
    })
  }

  for (const row of Array.isArray(gbif) ? gbif : []) {
    const key = row.key
    if (key == null || byKey.has(key)) continue
    const rank = (row.rank || '').toUpperCase()
    if (rank && rank !== 'SPECIES') continue
    if (!isTheraphosidaeRow(row)) continue
    byKey.set(key, {
      source: 'gbif',
      gbifKey: key,
      canonicalName: row.canonicalName || row.scientificName || '',
      family: row.family || undefined,
    })
  }

  return [...byKey.values()].slice(0, 20)
}
