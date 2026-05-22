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

/**
 * Multi item: batch add URL first, per product add URLs, then Monarch cart.
 * Single item: one product page add URL.
 */
export function openMonarchCartHandoff(handoff) {
  if (!handoff?.checkoutUrl) return

  const addUrls = Array.isArray(handoff.addToCartUrls) ? handoff.addToCartUrls.filter(Boolean) : []
  const cartUrl = handoff.cartUrl || 'https://monarchreptiles.com/cart/'
  const staggerMs = 700

  window.open(handoff.checkoutUrl, '_blank', 'noopener,noreferrer')

  if (handoff.fallbackBatchUrl && handoff.fallbackBatchUrl !== handoff.checkoutUrl) {
    setTimeout(() => {
      window.open(handoff.fallbackBatchUrl, '_blank', 'noopener,noreferrer')
    }, 400)
  }

  if (handoff.handoffMode === 'batch_fill' && addUrls.length > 1) {
    addUrls.forEach((url, index) => {
      setTimeout(() => {
        window.open(url, '_blank', 'noopener,noreferrer')
      }, 800 + index * staggerMs)
    })
    setTimeout(() => {
      window.open(cartUrl, '_blank', 'noopener,noreferrer')
    }, 800 + addUrls.length * staggerMs + 400)
  }
}
