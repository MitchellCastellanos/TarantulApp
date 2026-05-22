import { BRAND_WITH_TM } from '../constants/brand'

const CONTROL_CHARS_RE = /[\x00-\x1F\x7F]+/g

function cleanInlineText(value, fallback = '') {
  const text = String(value ?? '').trim()
  if (!text) return fallback
  return text
    .normalize('NFC')
    .replace(CONTROL_CHARS_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim() || fallback
}

function shortText(value, maxLength) {
  const text = cleanInlineText(value)
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

export function formatListingPrice(priceAmount, currency, t) {
  if (priceAmount == null) {
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

function locationLine(listing) {
  return [listing?.city, listing?.state, listing?.country].filter(Boolean).join(', ')
}

/**
 * Builds caption text for a marketplace listing, optimized per channel.
 * @param {object} params
 * @param {{ title?: string, speciesName?: string, priceAmount?: number|string|null, currency?: string|null, city?: string, state?: string, country?: string }} params.listing
 * @param {string} [params.sellerName]
 * @param {string} [params.sellerHandle]
 * @param {string} params.profileUrl
 * @param {(k: string, opts?: object) => string} params.t
 * @param {'default'|'whatsapp'|'instagram'} [params.channel]
 */
export function buildListingShareText({
  listing,
  sellerName,
  sellerHandle,
  profileUrl,
  t,
  channel = 'default',
}) {
  const title = shortText(listing?.title, 100)
  const species = shortText(listing?.speciesName, 90)
  const price = formatListingPrice(listing?.priceAmount, listing?.currency, t)
  const location = shortText(locationLine(listing), 90)
  const safeUrl = cleanInlineText(profileUrl, '')
  const safeSeller = cleanInlineText(sellerName, '')
  const safeHandle = sellerHandle ? `@${String(sellerHandle).replace(/^@+/, '')}` : ''

  if (channel === 'instagram') {
    return [
      `🕷️ ${title}`,
      species ? `${species}` : null,
      `💰 ${price}`,
      location ? `📍 ${location}` : null,
      safeHandle ? `${safeHandle} · TarantulApp™` : 'TarantulApp™',
      '#TarantulApp #TarantulaForSale #TarantulaHobby',
    ].filter(Boolean).join('\n')
  }

  if (channel === 'whatsapp') {
    return [
      `*🕷️ ${title}*`,
      species ? `• ${t('marketplace.fieldSpecies')}: ${species}` : null,
      `• ${t('share.priceLabel', { defaultValue: 'Price' })}: ${price}`,
      location ? `• ${t('share.locationLabel', { defaultValue: 'Location' })}: ${location}` : null,
      safeSeller || safeHandle
        ? `• ${t('share.sellerLabel', { defaultValue: 'Seller' })}: ${safeSeller || safeHandle}`
        : null,
      safeUrl ? `• ${safeUrl}` : null,
      `_${t('share.viaBrand', { brand: BRAND_WITH_TM, defaultValue: `via ${BRAND_WITH_TM}` })}_`,
    ].filter(Boolean).join('\n')
  }

  return [
    '━━━━━━━━━━━━━━━━━━━━',
    `🕷️ ${title}`,
    '━━━━━━━━━━━━━━━━━━━━',
    species ? `🔬 ${t('marketplace.fieldSpecies')}: ${species}` : null,
    `💰 ${t('share.priceLabel', { defaultValue: 'Price' })}: ${price}`,
    location ? `📍 ${t('share.locationLabel', { defaultValue: 'Location' })}: ${location}` : null,
    safeSeller || safeHandle
      ? `👤 ${t('share.sellerLabel', { defaultValue: 'Seller' })}: ${safeSeller || safeHandle}`
      : null,
    safeUrl ? `🔗 ${safeUrl}` : null,
    '',
    `${t('share.viaBrand', { brand: BRAND_WITH_TM, defaultValue: `via ${BRAND_WITH_TM}` })}`,
    '#TarantulApp #TarantulaForSale',
  ].filter(Boolean).join('\n')
}

/** Builds a wa.me deep link prefilled with the share text. */
export function whatsappShareUrl(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
