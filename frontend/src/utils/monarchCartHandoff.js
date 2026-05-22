/**
 * Opens Monarch cart handoff: batch URL first, then per-product add-to-cart tabs, then cart page.
 * Monarch WAF often blocks /cart/?add-to-cart=... but product-page adds usually work.
 */
export function openMonarchCartHandoff(handoff) {
  if (!handoff?.checkoutUrl) return

  const addUrls = Array.isArray(handoff.addToCartUrls) ? handoff.addToCartUrls.filter(Boolean) : []
  const cartUrl = handoff.cartUrl || handoff.checkoutUrl
  const staggerMs = 700

  window.open(handoff.checkoutUrl, '_blank', 'noopener,noreferrer')

  if (handoff.fallbackBatchUrl && handoff.fallbackBatchUrl !== handoff.checkoutUrl) {
    setTimeout(() => {
      window.open(handoff.fallbackBatchUrl, '_blank', 'noopener,noreferrer')
    }, 400)
  }

  if (addUrls.length > 1) {
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
