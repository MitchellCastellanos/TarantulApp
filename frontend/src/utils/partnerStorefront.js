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

/** Enabled official/founding partner (sync not required). */
export function vendorIsFeaturedOfficialPartner(vendor) {
  if (!vendor || vendor.enabled === false || vendor.isDemo) return false
  const tier = vendor.partnerProgramTier
  return vendor.isFoundingPartner === true || (tier && SYNC_PARTNER_TIERS.has(tier))
}

export function vendorHasInAppStorefront(vendor) {
  if (!vendorIsFeaturedOfficialPartner(vendor)) return false
  if (!vendor.listingImportEnabled) return false
  return true
}

/**
 * Whether a partner uses the in-app integrated cart (add-to-cart + cart bar handoff).
 * When false, each listing links directly to its own product page on the partner site.
 * Backend exposes `cartEnabled` on the vendor summary; defaults to enabled when absent.
 */
export function vendorCartEnabled(vendor) {
  return vendor?.cartEnabled !== false
}

/** Primary CTA for a partner card: in-app storefront when synced, else external site. */
export function partnerFeaturedHref(vendor) {
  if (vendorHasInAppStorefront(vendor)) {
    const path = partnerStorefrontPath(vendor.slug)
    if (path) return { href: path, external: false }
  }
  const site = String(vendor?.websiteUrl || '').trim()
  if (site) return { href: site, external: true }
  const path = partnerStorefrontPath(vendor.slug)
  return path ? { href: path, external: false } : null
}
