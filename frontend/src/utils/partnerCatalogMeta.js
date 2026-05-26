import marketplaceService from '../services/marketplaceService'

export const PARTNER_CATALOG_PREVIEW_COUNT = 2

/**
 * Public partner catalog size + preview rows (same rules as storefront / partner-catalog API).
 */
export async function fetchPartnerCatalogMeta(slug) {
  const vendorSlug = String(slug || '').trim()
  if (!vendorSlug) {
    return { catalogTotal: 0, previewItems: [] }
  }
  try {
    let data = await marketplaceService.getPartnerCatalog({
      vendorSlug,
      promotedOnly: true,
    })
    let items = Array.isArray(data?.items) ? data.items : []
    if (items.length < PARTNER_CATALOG_PREVIEW_COUNT) {
      data = await marketplaceService.getPartnerCatalog({ vendorSlug })
      items = Array.isArray(data?.items) ? data.items : []
    }
    const catalogTotal =
      typeof data?.catalogTotal === 'number' && Number.isFinite(data.catalogTotal)
        ? data.catalogTotal
        : items.length
    return {
      catalogTotal,
      previewItems: items.slice(0, PARTNER_CATALOG_PREVIEW_COUNT),
    }
  } catch {
    return { catalogTotal: 0, previewItems: [] }
  }
}

export function resolvePartnerCatalogCount(vendor, catalogMeta) {
  const fromMeta = catalogMeta?.catalogTotal
  if (typeof fromMeta === 'number' && Number.isFinite(fromMeta) && fromMeta > 0) {
    return fromMeta
  }
  const fromVendor = vendor?.catalogTotal ?? vendor?.activeListingCount
  if (typeof fromVendor === 'number' && Number.isFinite(fromVendor)) {
    return fromVendor
  }
  return 0
}
