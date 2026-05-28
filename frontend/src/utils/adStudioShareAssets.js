import { imgUrl } from '../services/api'
import marketplaceService from '../services/marketplaceService'
import { buildListingSharePngDataUrl } from './listingShareCard'
import { decodeListingText, decodeListingTitle, partnerListingImageUrl } from './listingDisplay'
import { shareOrDownloadDataUrl, sanitizeFilename } from './shareOrDownloadBlob'

function listingGalleryUrls(listing) {
  const raw = listing?.imageUrls
  if (Array.isArray(raw) && raw.length > 0) return raw.map((u) => String(u || '').trim()).filter(Boolean)
  const single = listing?.imageUrl
  if (single) return [String(single).trim()].filter(Boolean)
  return []
}

function resolveShareUrls(payload, listingId) {
  const listing = payload?.listing
  const sellerPreview = payload?.sellerPreview || null
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tarantulapp.com'
  const isPartner = listing?.source === 'partner' || listing?.isPartner
  const handle = sellerPreview?.handle || listing?.sellerHandle
  let storeUrl = ''
  if (isPartner && listing?.officialVendor?.slug) {
    storeUrl = `${origin}/partner/${encodeURIComponent(listing.officialVendor.slug)}`
  } else if (handle) {
    storeUrl = `${origin}/shop/${encodeURIComponent(handle)}`
  }
  const listingUrl = listingId ? `${origin}/marketplace/listing/${listingId}` : `${origin}/marketplace`
  const partner = isPartner
  const images = listingGalleryUrls(listing).map((u) => (partner ? partnerListingImageUrl(u) : imgUrl(u)) || u)
  const imageUrl = images[0] || null
  return { listing, sellerPreview, listingUrl, storeUrl, imageUrl }
}

/** Fetch public listing detail and build the same branded PNG used in Listing Share Kit. */
export async function buildAdStudioListingSharePng(listingId, t) {
  const payload = await marketplaceService.getPublicListing(listingId)
  const { listing, sellerPreview, listingUrl, storeUrl, imageUrl } = resolveShareUrls(payload, listingId)
  if (!listing) throw new Error('LISTING_NOT_FOUND')
  const normalized = {
    ...listing,
    title: listing.title ? decodeListingTitle(listing.title) : listing.title,
    description: listing.description ? decodeListingText(listing.description) : listing.description,
  }
  return buildListingSharePngDataUrl({
    listing: normalized,
    imageUrl,
    sellerHandle: sellerPreview?.handle || listing.sellerHandle,
    sellerName: sellerPreview?.displayName || listing.sellerName,
    profileUrl: listingUrl,
    storeUrl,
    t,
  })
}

export async function downloadAdStudioListingSharePng(listingId, titleHint, t) {
  const dataUrl = await buildAdStudioListingSharePng(listingId, t)
  const base = sanitizeFilename(titleHint || 'tarantulapp-listing')
  await shareOrDownloadDataUrl(dataUrl, `${base}-share.png`, {
    mimeType: 'image/png',
    title: titleHint || 'TarantulApp',
    dialogTitle: t('share.listing.dialogTitle', { defaultValue: 'Share listing' }),
  })
}
