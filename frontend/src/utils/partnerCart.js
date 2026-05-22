const CART_KEY = 'tarantulapp.partnerCart.v1'
export const MONARCH_VENDOR_SLUG = 'monarch-reptiles'

export function readPartnerCart() {
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (!raw) return { vendorSlug: MONARCH_VENDOR_SLUG, lines: [] }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.lines)) {
      return { vendorSlug: MONARCH_VENDOR_SLUG, lines: [] }
    }
    return {
      vendorSlug: parsed.vendorSlug || MONARCH_VENDOR_SLUG,
      lines: parsed.lines.filter((l) => l && l.externalProductId),
    }
  } catch {
    return { vendorSlug: MONARCH_VENDOR_SLUG, lines: [] }
  }
}

export function writePartnerCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart))
  window.dispatchEvent(new CustomEvent('tarantulapp-partner-cart'))
}

export function addPartnerCartLine(line) {
  const cart = readPartnerCart()
  const vendorSlug = line.vendorSlug || MONARCH_VENDOR_SLUG
  const externalProductId = String(line.externalProductId || '').trim()
  if (!externalProductId) return cart
  const existing = cart.lines.find((l) => l.externalProductId === externalProductId)
  const qty = Math.max(1, Math.min(99, Number(line.quantity) || 1))
  if (existing) {
    existing.quantity = Math.min(99, (existing.quantity || 1) + qty)
  } else {
    cart.lines.push({
      listingId: line.listingId || null,
      externalProductId,
      title: line.title || '',
      priceAmount: line.priceAmount ?? null,
      currency: line.currency || 'CAD',
      imageUrl: line.imageUrl || '',
      canonicalUrl: line.canonicalUrl || '',
      quantity: qty,
    })
  }
  cart.vendorSlug = vendorSlug
  writePartnerCart(cart)
  return cart
}

export function updatePartnerCartQty(externalProductId, quantity) {
  const cart = readPartnerCart()
  const line = cart.lines.find((l) => l.externalProductId === externalProductId)
  if (!line) return cart
  if (quantity <= 0) {
    cart.lines = cart.lines.filter((l) => l.externalProductId !== externalProductId)
  } else {
    line.quantity = Math.min(99, quantity)
  }
  writePartnerCart(cart)
  return cart
}

export function clearPartnerCart() {
  writePartnerCart({ vendorSlug: MONARCH_VENDOR_SLUG, lines: [] })
}

export function partnerCartCount(cart = readPartnerCart()) {
  return cart.lines.reduce((sum, l) => sum + (l.quantity || 1), 0)
}
