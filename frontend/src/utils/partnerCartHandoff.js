/**
 * Opens the URLs returned by the backend handoff service.
 * Multi-item WooCommerce handoff tries the batch URL first, then individual product adds, then the cart page.
 */
export function openPartnerCartHandoff(handoff) {
  if (!handoff?.checkoutUrl) return

  const addUrls = Array.isArray(handoff.addToCartUrls) ? handoff.addToCartUrls.filter(Boolean) : []
  const cartUrl = handoff.cartUrl || handoff.storeBaseUrl || handoff.websiteUrl || ''
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
    if (cartUrl) {
      setTimeout(() => {
        window.open(cartUrl, '_blank', 'noopener,noreferrer')
      }, 800 + addUrls.length * staggerMs + 400)
    }
  }
}
