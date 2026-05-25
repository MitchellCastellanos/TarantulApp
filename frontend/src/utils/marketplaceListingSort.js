/** Client-side sort for marketplace / partner storefront listing grids. */
function trustScore(row) {
  let s = 0
  if (row.sellerStorefrontVerified) s += 40
  if (row.boosted) s += 12
  if (row.source === 'partner' || row.isPartner) s += 18
  if (row.isFoundingPartner || row.partnerProgramTier === 'STRATEGIC_FOUNDER') s += 22
  if (row.promoted) s += 14
  if (row.imageUrl) s += 6
  if (row.priceAmount != null) s += 4
  const createdMs = row.createdAt ? Date.parse(row.createdAt) : 0
  if (!Number.isNaN(createdMs) && createdMs > 0) {
    const hours = (Date.now() - createdMs) / (1000 * 60 * 60)
    s += Math.max(0, 20 - Math.min(20, hours / 12))
  }
  return s
}

export function sortMarketplaceListings(listings, sortMode) {
  const base = Array.isArray(listings) ? listings.filter((l) => l && l.status !== 'hidden') : []
  const sorted = [...base]

  if (sortMode === 'trust') {
    sorted.sort((a, b) => trustScore(b) - trustScore(a))
    return sorted
  }

  if (sortMode === 'newest') {
    sorted.sort((a, b) => {
      const am = a.createdAt ? Date.parse(a.createdAt) : 0
      const bm = b.createdAt ? Date.parse(b.createdAt) : 0
      return bm - am
    })
    return sorted
  }

  if (sortMode === 'price_asc') {
    sorted.sort((a, b) => {
      const ap = Number(a.priceAmount ?? Number.POSITIVE_INFINITY)
      const bp = Number(b.priceAmount ?? Number.POSITIVE_INFINITY)
      return ap - bp
    })
    return sorted
  }

  if (sortMode === 'price_desc') {
    sorted.sort((a, b) => {
      const ap = Number(a.priceAmount ?? Number.NEGATIVE_INFINITY)
      const bp = Number(b.priceAmount ?? Number.NEGATIVE_INFINITY)
      return bp - ap
    })
    return sorted
  }

  if (sortMode === 'views') {
    sorted.sort((a, b) => (Number(b.viewCount) || 0) - (Number(a.viewCount) || 0))
    return sorted
  }

  sorted.sort((a, b) => trustScore(b) - trustScore(a))
  return sorted
}

export const MARKETPLACE_SORT_OPTIONS = ['trust', 'newest', 'price_asc', 'price_desc', 'views']
