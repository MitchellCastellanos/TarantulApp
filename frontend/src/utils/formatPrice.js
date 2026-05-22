/**
 * Centralized price display for marketplace listings.
 * Uses Intl.NumberFormat with the listing's currency so MXN, CAD, and USD
 * each render with their proper symbol and thousands separators.
 *
 * Returns the localized "Price on request" string (passed via i18n) when
 * priceAmount is missing.
 */

export function formatListingPrice(priceAmount, currency, t) {
  if (priceAmount == null || priceAmount === '') {
    return t ? t('marketplace.priceOnRequest') : 'Price on request'
  }
  const num = Number(priceAmount)
  if (!Number.isFinite(num)) return String(priceAmount)
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: num >= 100 ? 0 : 2,
    }).format(num)
  } catch {
    return `${num} ${currency || ''}`.trim()
  }
}
