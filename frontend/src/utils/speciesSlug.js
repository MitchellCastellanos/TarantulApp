/**
 * Stable slug for catalog lookups from scientific name (matches seed data keys).
 */
export function toSpeciesSlug(scientificName) {
  if (!scientificName || typeof scientificName !== 'string') return ''
  return scientificName
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}
