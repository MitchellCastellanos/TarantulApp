import QRCode from 'qrcode'
import { BRAND_WITH_TM } from '../constants/brand'
import {
  BRAND_LOGO_FOR_LIGHT_BG,
  compositeQrPngDataUrl,
  loadImageElement,
} from './qrBrandComposite'

const BRAND_TEXTURE = '/bg-texture.png'
const CORNER_MARK = '/tarantula-card-corner-mark.png'

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

function drawFoundingBadge(ctx, text, x, y) {
  ctx.save()
  ctx.font = 'bold 18px sans-serif'
  const padX = 14
  const padY = 8
  const textW = ctx.measureText(text).width
  const badgeW = textW + padX * 2
  const badgeH = 18 + padY * 2
  ctx.fillStyle = '#d4af37'
  ctx.beginPath()
  const r = 8
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + badgeW, y, x + badgeW, y + badgeH, r)
  ctx.arcTo(x + badgeW, y + badgeH, x, y + badgeH, r)
  ctx.arcTo(x, y + badgeH, x, y, r)
  ctx.arcTo(x, y, x + badgeW, y, r)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#0c0c1e'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + padX, y + badgeH / 2)
  ctx.restore()
  return badgeH
}

/**
 * Generates a 1080×1080 branded share card for a partner storefront.
 * @param {object} params
 * @param {string} params.vendorName
 * @param {string} [params.location]
 * @param {string} [params.vendorNote]
 * @param {number} [params.catalogTotal]
 * @param {string|null} [params.imageUrl]
 * @param {string} params.storefrontUrl
 * @param {boolean} [params.isFounding]
 * @param {(k: string, opts?: object) => string} params.t
 * @returns {Promise<string>} data URL (PNG)
 */
export async function buildStorefrontSharePngDataUrl({
  vendorName,
  location,
  vendorNote,
  catalogTotal,
  imageUrl,
  storefrontUrl,
  isFounding,
  t,
}) {
  const W = 1080
  const H = 1080
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

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

  const fadeH = 120
  const fade = ctx.createLinearGradient(0, imgZoneH - fadeH, 0, imgZoneH)
  fade.addColorStop(0, 'rgba(12, 12, 30, 0)')
  fade.addColorStop(1, 'rgba(12, 12, 30, 1)')
  ctx.fillStyle = fade
  ctx.fillRect(0, imgZoneH - fadeH, W, fadeH)

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

  const chipLogoSize = 52
  const chipY = panelY + 28
  let brandLogo = null
  try {
    brandLogo = await loadImageElement(BRAND_LOGO_FOR_LIGHT_BG)
  } catch {
    /* wordmark only */
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

  const pillText = t('share.storefront.cardEyebrow', { defaultValue: 'OFFICIAL PARTNER' }).toUpperCase()
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

  const qrSize = 150
  const qrPlatePad = 10
  const qrColX = W - pad - qrSize
  const qrLabelFont = 'bold 18px sans-serif'
  const qrLabelHeight = 20
  const qrLabelGap = 10
  const qrCaptionGap = 10
  const qrCaptionHeight = 16
  const qrStackHeight = qrLabelHeight + qrLabelGap + qrSize + qrCaptionGap + qrCaptionHeight
  const qrStackTop = panelY + Math.max(56, Math.round((panelH - qrStackHeight) / 2))
  const qrLabelY = qrStackTop
  const qrY = qrLabelY + qrLabelHeight + qrLabelGap
  const qrCaptionY = qrY + qrSize + qrCaptionGap
  const qrCenterX = qrColX + qrSize / 2
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.055)'
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.22)'
  ctx.lineWidth = 1
  drawRoundRect(ctx, qrColX - 24, qrStackTop - 20, qrSize + 48, qrStackHeight + 36, 22)
  ctx.fill()
  ctx.stroke()
  ctx.restore()

  const contentLeftW = qrColX - pad - 28

  let cursorY = panelY + 108

  if (isFounding) {
    const badgeText = t('share.storefront.foundingBadge', { defaultValue: 'Founding partner' }).toUpperCase()
    const badgeH = drawFoundingBadge(ctx, badgeText, pad, cursorY)
    cursorY += badgeH + 16
  }

  ctx.fillStyle = isFounding ? '#d4af37' : '#f5f0e6'
  ctx.font = 'bold 54px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  const nameLines = wrapLines(ctx, vendorName || '', contentLeftW, 2)
  for (const line of nameLines) {
    ctx.fillText(line, pad, cursorY)
    cursorY += 64
  }
  cursorY += 10

  if (location) {
    ctx.fillStyle = 'rgba(245, 240, 230, 0.72)'
    ctx.font = '26px sans-serif'
    const locLines = wrapLines(ctx, location, contentLeftW, 1)
    if (locLines[0]) {
      ctx.fillText(locLines[0], pad, cursorY)
      cursorY += 40
    }
  }

  if (vendorNote) {
    ctx.fillStyle = 'rgba(245, 240, 230, 0.62)'
    ctx.font = 'italic 24px sans-serif'
    const noteLines = wrapLines(ctx, vendorNote, contentLeftW, 2)
    for (const line of noteLines) {
      ctx.fillText(line, pad, cursorY)
      cursorY += 32
    }
    cursorY += 8
  }

  cursorY += 8

  const count = Number(catalogTotal)
  if (Number.isFinite(count) && count > 0) {
    ctx.fillStyle = '#d4af37'
    ctx.font = 'bold 44px sans-serif'
    const countText = t('share.storefront.listingsCount', {
      count,
      defaultValue: `${count} listings`,
    })
    ctx.fillText(countText, pad, cursorY)
    cursorY += 58
  }

  ctx.fillStyle = 'rgba(245, 240, 230, 0.55)'
  ctx.font = '22px sans-serif'
  const officialText = t('share.storefront.officialLine', {
    brand: BRAND_WITH_TM,
    defaultValue: `Official catalog on ${BRAND_WITH_TM}`,
  })
  const officialLines = wrapLines(ctx, officialText, contentLeftW, 2)
  for (const line of officialLines) {
    ctx.fillText(line, pad, cursorY)
    cursorY += 28
  }

  ctx.fillStyle = 'rgba(245, 240, 230, 0.85)'
  ctx.font = qrLabelFont
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  const browseLabel = t('share.storefront.scanToBrowse', { defaultValue: 'Scan to browse' }).toUpperCase()
  ctx.fillText(browseLabel, qrCenterX, qrLabelY)

  if (storefrontUrl) {
    try {
      const qrImg = await buildBrandedQrImage(storefrontUrl, qrSize)
      drawQrPlate(ctx, qrColX, qrY, qrSize, qrPlatePad)
      ctx.drawImage(qrImg, qrColX, qrY, qrSize, qrSize)
    } catch {
      /* skip QR if generation fails */
    }
  }

  ctx.fillStyle = 'rgba(245, 240, 230, 0.55)'
  ctx.font = '14px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('tarantulapp.com', qrCenterX, qrCaptionY)

  try {
    return canvas.toDataURL('image/png')
  } catch (err) {
    if (photoLoaded) {
      return buildStorefrontSharePngDataUrl({
        vendorName,
        location,
        vendorNote,
        catalogTotal,
        imageUrl: null,
        storefrontUrl,
        isFounding,
        t,
      })
    }
    throw err
  }
}
