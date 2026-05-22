/** Build Monarch product-page add-to-cart URL (one item — avoids WAF 403 on batch URLs). */
export function monarchLineAddUrl(line) {
  if (!line?.externalProductId) return null
  const qty = Math.max(1, Math.min(99, Number(line.quantity) || 1))
  const params = `add-to-cart=${encodeURIComponent(line.externalProductId)}&quantity=${qty}&utm_source=tarantulapp&utm_medium=partner_cart`
  if (line.canonicalUrl) {
    const base = line.canonicalUrl.split('?')[0]
    return `${base}?${params}`
  }
  return `https://monarchreptiles.com/?${params}`
}

/** Single item: open product add URL. Multi-item uses stepped UI in PartnerCartBar. */
export function openMonarchCartHandoff(handoff) {
  if (handoff?.handoffMode !== 'product_page_add') return
  const url = handoff.addToCartUrls?.[0] || handoff.checkoutUrl
  if (url) window.open(url, '_blank', 'noopener,noreferrer')
}
