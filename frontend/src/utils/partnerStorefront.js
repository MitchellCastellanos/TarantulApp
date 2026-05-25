/** Strategic partners with synced catalog get an in-app storefront at /partner/:slug */
const SYNC_PARTNER_TIERS = new Set([
  'FOUNDING_PARTNER',
  'OFFICIAL_PARTNER',
  'STRATEGIC_FOUNDER',
  'STRATEGIC_PARTNER',
])

export function partnerStorefrontPath(slug) {
  const s = String(slug || '').trim()
  if (!s) return null
  return `/partner/${encodeURIComponent(s)}`
}

export function vendorHasInAppStorefront(vendor) {
  if (!vendor || vendor.enabled === false) return false
  if (!vendor.listingImportEnabled) return false
  const tier = vendor.partnerProgramTier
  return vendor.isFoundingPartner === true || (tier && SYNC_PARTNER_TIERS.has(tier))
}
