import QRCode from 'qrcode'
import { BRAND_WITH_TM } from '../constants/brand'
import {
  BRAND_LOGO_FOR_LIGHT_BG,
  compositeQrPngDataUrl,
  loadImageElement,
} from './qrBrandComposite'
import { formatListingPrice } from './listingShareTemplates'

const BRAND_TEXTURE = '/bg-texture.png'
const CORNER_MARK = '/tarantula-card-corner-mark.png'

/** Loads a (potentially cross-origin) image so that the canvas can be exported. */
function loadCorsImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error('no src'))
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })
}

function wrapLines(ctx, text, maxWidth, maxLines) {
  const raw = String(text ?? '').trim()
  if (!raw) return []
  const words = raw.split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word
    if (ctx.measureText(trial).width <= maxWidth) {
      line = trial
      continue
    }
    if (line) lines.push(line)
    if (ctx.measureText(word).width <= maxWidth) {
      line = word
    } else {
      let w = word
      const ell = '…'
      while (w.length > 1 && ctx.measureText(w + ell).width > maxWidth) {
        w = w.slice(0, -1)
      }
      lines.push(w + (w.length < word.length ? ell : ''))
      line = ''
    }
    if (lines.length >= maxLines) break
  }
  if (line && lines.length < maxLines) lines.push(line)
  if (lines.length === maxLines) {
    const last = lines[lines.length - 1]
    const ell = '…'
    if (ctx.measureText(last).width > maxWidth - ctx.measureText(ell).width) {
      let trimmed = last
      while (trimmed.length > 1 && ctx.measureText(trimmed + ell).width > maxWidth) {
        trimmed = trimmed.slice(0, -1)
      }
      lines[lines.length - 1] = trimmed + ell
    }
  }
  return lines
}

function drawCoverImage(ctx, img, dx, dy, dw, dh) {
  const iw = img.naturalWidth || img.width
  const ih = img.naturalHeight || img.height
  if (iw <= 0 || ih <= 0) return
  const ratio = Math.max(dw / iw, dh / ih)
  const cw = iw * ratio
  const ch = ih * ratio
  const cx = dx + (dw - cw) / 2
  const cy = dy + (dh - ch) / 2
  ctx.drawImage(img, cx, cy, cw, ch)
}

function drawSpiderFallback(ctx, x, y, w, h) {
  const grad = ctx.createLinearGradient(x, y, x, y + h)
  grad.addColorStop(0, '#1a1040')
  grad.addColorStop(1, '#0c0c1e')
  ctx.fillStyle = grad
  ctx.fillRect(x, y, w, h)
  ctx.save()
  ctx.fillStyle = 'rgba(212, 175, 55, 0.18)'
  ctx.font = 'bold 320px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('🕷️', x + w / 2, y + h / 2)
  ctx.restore()
}

/** Branded QR (logo centered) at the given pixel size, ready to draw onto another canvas. */
async function buildBrandedQrImage(url, size) {
  const raw = await QRCode.toDataURL(url, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#FFFFFF' },
  })
  const composed = await compositeQrPngDataUrl(raw, size)
  return loadImageElement(composed)
}

/** White rounded plate behind a QR so it stays scannable on the dark panel. */
function drawQrPlate(ctx, x, y, size, padding = 12, radius = 14) {
  const plateX = x - padding
  const plateY = y - padding
  const plateSize = size + padding * 2
  ctx.save()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  const r = Math.min(radius, plateSize / 2)
  ctx.moveTo(plateX + r, plateY)
  ctx.arcTo(plateX + plateSize, plateY, plateX + plateSize, plateY + plateSize, r)
  ctx.arcTo(plateX + plateSize, plateY + plateSize, plateX, plateY + plateSize, r)
  ctx.arcTo(plateX, plateY + plateSize, plateX, plateY, r)
  ctx.arcTo(plateX, plateY, plateX + plateSize, plateY, r)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawCardVignette(ctx, w, h) {
  const vignette = ctx.createRadialGradient(w / 2, h * 0.42, 120, w / 2, h * 0.46, w * 0.72)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(0,0,0,0.48)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, w, h)
}

function drawGoldRule(ctx, x, y, w, h) {
  const grad = ctx.createLinearGradient(x, y, x + w, y)
  grad.addColorStop(0, '#8c6b24')
  grad.addColorStop(0.35, '#f1d06a')
  grad.addColorStop(1, '#6f4e12')
  ctx.fillStyle = grad
  ctx.fillRect(x, y, w, h)
}

function drawRoundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

/**
 * Generates a 1080×1080 branded share card for a marketplace listing.
 * Loads the listing image with CORS; falls back to a brand gradient if blocked.
 * @param {object} params
 * @param {{ title?: string, speciesName?: string, priceAmount?: number|string|null, currency?: string|null }} params.listing
 * @param {string|null} [params.imageUrl]
 * @param {string} [params.sellerHandle]
 * @param {string} [params.sellerName]
 * @param {string} params.profileUrl — URL of the listing detail page (QR target).
 * @param {string} [params.storeUrl] — URL of the partner store on TarantulApp (QR target).
 * @param {(k: string, opts?: object) => string} params.t
 * @returns {Promise<string>} data URL (PNG)
 */
export async function buildListingSharePngDataUrl({
  listing,
  imageUrl,
  sellerHandle,
  sellerName,
  profileUrl,
  storeUrl,
  t,
}) {
  const W = 1080
  const H = 1080
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // Background.
  ctx.fillStyle = '#0c0c1e'
  ctx.fillRect(0, 0, W, H)
  try {
    const texture = await loadImageElement(BRAND_TEXTURE)
    ctx.globalAlpha = 0.18
    drawCoverImage(ctx, texture, 0, 0, W, H)
    ctx.globalAlpha = 1
  } catch {
    /* texture is optional */
  }

  // Top zone (image) — 55% of height; the rest is the info panel.
  const imgZoneH = Math.round(H * 0.55)
  let photoLoaded = false
  if (imageUrl) {
    try {
      const photo = await loadCorsImage(imageUrl)
      drawCoverImage(ctx, photo, 0, 0, W, imgZoneH)
      photoLoaded = true
    } catch {
      photoLoaded = false
    }
  }
  if (!photoLoaded) {
    drawSpiderFallback(ctx, 0, 0, W, imgZoneH)
  }
  drawCardVignette(ctx, W, imgZoneH)
  drawGoldRule(ctx, 0, 0, W, 10)

  // Soft fade at the seam between photo and panel.
  const fadeH = 120
  const fade = ctx.createLinearGradient(0, imgZoneH - fadeH, 0, imgZoneH)
  fade.addColorStop(0, 'rgba(12, 12, 30, 0)')
  fade.addColorStop(1, 'rgba(12, 12, 30, 1)')
  ctx.fillStyle = fade
  ctx.fillRect(0, imgZoneH - fadeH, W, fadeH)

  // Bottom panel.
  const panelY = imgZoneH
  const panelH = H - imgZoneH
  const panelGrad = ctx.createLinearGradient(0, panelY, W, H)
  panelGrad.addColorStop(0, '#11112a')
  panelGrad.addColorStop(0.58, '#0c0c1e')
  panelGrad.addColorStop(1, '#070711')
  ctx.fillStyle = panelGrad
  ctx.fillRect(0, panelY, W, panelH)
  drawGoldRule(ctx, 0, panelY, W, 4)
  try {
    const corner = await loadImageElement(CORNER_MARK)
    ctx.globalAlpha = 0.18
    ctx.drawImage(corner, W - 330, panelY + 18, 280, 280)
    ctx.globalAlpha = 1
  } catch {
    /* ornamental mark is optional */
  }

  const pad = 56

  // Brand chip (logo + wordmark) — top-left of the panel.
  const chipLogoSize = 52
  const chipY = panelY + 28
  let brandLogo = null
  try {
    brandLogo = await loadImageElement(BRAND_LOGO_FOR_LIGHT_BG)
  } catch {
    /* no logo, fall through to wordmark only */
  }
  let chipCursorX = pad
  if (brandLogo) {
    ctx.save()
    ctx.fillStyle = '#f5f0e6'
    ctx.beginPath()
    ctx.arc(chipCursorX + chipLogoSize / 2, chipY + chipLogoSize / 2, chipLogoSize / 2 + 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.save()
    ctx.beginPath()
    ctx.arc(chipCursorX + chipLogoSize / 2, chipY + chipLogoSize / 2, chipLogoSize / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(brandLogo, chipCursorX, chipY, chipLogoSize, chipLogoSize)
    ctx.restore()
    ctx.restore()
    chipCursorX += chipLogoSize + 16
  }
  ctx.fillStyle = '#f5f0e6'
  ctx.font = 'bold 30px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(BRAND_WITH_TM, chipCursorX, chipY + chipLogoSize / 2)
  ctx.textBaseline = 'top'

  const pillText = t('share.listing.cardEyebrow', { defaultValue: 'MARKETPLACE LISTING' }).toUpperCase()
  ctx.font = 'bold 17px sans-serif'
  const pillW = ctx.measureText(pillText).width + 30
  ctx.fillStyle = 'rgba(212, 175, 55, 0.18)'
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.7)'
  ctx.lineWidth = 1
  drawRoundRect(ctx, W - pad - pillW, chipY + 5, pillW, 36, 18)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#f1d06a'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(pillText, W - pad - pillW / 2, chipY + 23)
  ctx.textBaseline = 'top'

  // Right column hosts both QRs stacked vertically — keeps the left side
  // wide enough for a 2-line title without truncating long species names.
  const qrSize = 116
  const qrPlatePad = 10
  const qrColX = W - pad - qrSize
  const qrLabelFont = 'bold 16px sans-serif'
  const qrLabelHeight = 18
  const qrLabelGap = 8
  const qrIntraGap = 28
  const qrCaptionGap = 8
  const qrCaptionHeight = 16
  const qrStackHeight =
    qrLabelHeight + qrLabelGap + qrSize +
    qrIntraGap +
    qrLabelHeight + qrLabelGap + qrSize +
    qrCaptionGap + qrCaptionHeight
  // Center the stack vertically inside the panel.
  const qrStackTop = panelY + Math.max(56, Math.round((panelH - qrStackHeight) / 2))
  const qr1LabelY = qrStackTop
  const qr1Y = qr1LabelY + qrLabelHeight + qrLabelGap
  const qr2LabelY = qr1Y + qrSize + qrIntraGap
  const qr2Y = qr2LabelY + qrLabelHeight + qrLabelGap
  const qr2CaptionY = qr2Y + qrSize + qrCaptionGap
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.055)'
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.22)'
  ctx.lineWidth = 1
  drawRoundRect(ctx, qrColX - 24, qrStackTop - 20, qrSize + 48, qrStackHeight + 36, 22)
  ctx.fill()
  ctx.stroke()
  ctx.restore()

  // Left column content stops well before the QR strip.
  const contentLeftW = qrColX - pad - 28

  // Title (max 2 lines).
  let cursorY = panelY + 108
  ctx.fillStyle = '#f5f0e6'
  ctx.font = 'bold 50px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  const titleLines = wrapLines(ctx, listing?.title || '', contentLeftW, 2)
  for (const line of titleLines) {
    ctx.fillText(line, pad, cursorY)
    cursorY += 60
  }
  cursorY += 14

  // Species (italic, 1 line).
  if (listing?.speciesName) {
    ctx.fillStyle = 'rgba(245, 240, 230, 0.72)'
    ctx.font = 'italic 28px sans-serif'
    const speciesLines = wrapLines(ctx, listing.speciesName, contentLeftW, 1)
    if (speciesLines[0]) {
      ctx.fillText(speciesLines[0], pad, cursorY)
      cursorY += 44
    }
  }

  cursorY += 12

  // Price (gold).
  const priceText = formatListingPrice(listing?.priceAmount, listing?.currency, t)
  ctx.fillStyle = '#d4af37'
  ctx.font = 'bold 62px sans-serif'
  ctx.fillText(priceText, pad, cursorY)
  cursorY += 80

  // Seller / partner store invite.
  const cleanHandle = sellerHandle ? String(sellerHandle).replace(/^@+/, '') : ''
  const sellerLine = sellerName || (cleanHandle ? `@${cleanHandle}` : '')
  if (sellerLine) {
    ctx.fillStyle = 'rgba(245, 240, 230, 0.78)'
    ctx.font = 'bold 26px sans-serif'
    const sellerLines = wrapLines(ctx, sellerLine, contentLeftW, 1)
    if (sellerLines[0]) {
      ctx.fillText(sellerLines[0], pad, cursorY)
      cursorY += 36
    }
  }
  if (cleanHandle) {
    ctx.fillStyle = 'rgba(245, 240, 230, 0.55)'
    ctx.font = '22px sans-serif'
    const visitText = t('share.listing.visitStoreLine', {
      handle: `@${cleanHandle}`,
      brand: BRAND_WITH_TM,
      defaultValue: `Visit @${cleanHandle} on ${BRAND_WITH_TM}`,
    })
    const visitLines = wrapLines(ctx, visitText, contentLeftW, 2)
    for (const line of visitLines) {
      ctx.fillText(line, pad, cursorY)
      cursorY += 28
    }
  }

  // QR labels above each code.
  ctx.fillStyle = 'rgba(245, 240, 230, 0.85)'
  ctx.font = qrLabelFont
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const buyLabel = t('share.listing.scanToBuy', { defaultValue: 'Scan to buy' }).toUpperCase()
  const storeLabel = t('share.listing.visitStore', { defaultValue: 'Visit store' }).toUpperCase()
  const qrCenterX = qrColX + qrSize / 2
  if (profileUrl) {
    ctx.fillText(buyLabel, qrCenterX, qr1LabelY)
  }
  if (storeUrl) {
    ctx.fillText(storeLabel, qrCenterX, qr2LabelY)
  }

  // QR codes (branded with the center logo) on white plates.
  if (profileUrl) {
    try {
      const qrImg = await buildBrandedQrImage(profileUrl, qrSize)
      drawQrPlate(ctx, qrColX, qr1Y, qrSize, qrPlatePad)
      ctx.drawImage(qrImg, qrColX, qr1Y, qrSize, qrSize)
    } catch {
      /* skip QR1 if generation fails */
    }
  }
  if (storeUrl) {
    try {
      const qrImg = await buildBrandedQrImage(storeUrl, qrSize)
      drawQrPlate(ctx, qrColX, qr2Y, qrSize, qrPlatePad)
      ctx.drawImage(qrImg, qrColX, qr2Y, qrSize, qrSize)
    } catch {
      /* skip QR2 if generation fails */
    }
  }

  // Tiny caption with the partner handle under the store QR.
  if (storeUrl && cleanHandle) {
    ctx.fillStyle = 'rgba(245, 240, 230, 0.55)'
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`@${cleanHandle}`, qrCenterX, qr2CaptionY)
  }

  try {
    return canvas.toDataURL('image/png')
  } catch (err) {
    // canvas was tainted by cross-origin photo — fallback render without photo.
    if (photoLoaded) {
      return buildListingSharePngDataUrl({
        listing,
        imageUrl: null,
        sellerHandle,
        sellerName,
        profileUrl,
        storeUrl,
        t,
      })
    }
    throw err
  }
}
