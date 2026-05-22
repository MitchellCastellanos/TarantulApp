/** Strategic partners with synced catalog get an in-app storefront at /partner/:slug */
const STRATEGIC_TIERS = new Set(['STRATEGIC_FOUNDER', 'STRATEGIC_PARTNER'])

export function partnerStorefrontPath(slug) {
  const s = String(slug || '').trim()
  if (!s) return null
  return `/partner/${encodeURIComponent(s)}`
}

export function vendorHasInAppStorefront(vendor) {
  if (!vendor || vendor.enabled === false) return false
  if (!vendor.listingImportEnabled) return false
  const tier = vendor.partnerProgramTier
  return vendor.isFoundingPartner === true || (tier && STRATEGIC_TIERS.has(tier))
}
