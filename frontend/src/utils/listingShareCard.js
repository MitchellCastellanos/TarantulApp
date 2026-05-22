import { BRAND_WITH_TM } from '../constants/brand'
import { BRAND_LOGO_FOR_LIGHT_BG, loadImageElement } from './qrBrandComposite'
import { formatListingPrice } from './listingShareTemplates'

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

/**
 * Generates a 1080×1080 branded share card for a marketplace listing.
 * Loads the listing image with CORS; falls back to a brand gradient if blocked.
 * @param {object} params
 * @param {{ title?: string, speciesName?: string, priceAmount?: number|string|null, currency?: string|null }} params.listing
 * @param {string|null} [params.imageUrl]
 * @param {string} [params.sellerHandle]
 * @param {string} [params.sellerName]
 * @param {string} params.profileUrl
 * @param {(k: string, opts?: object) => string} params.t
 * @returns {Promise<string>} data URL (PNG)
 */
export async function buildListingSharePngDataUrl({
  listing,
  imageUrl,
  sellerHandle,
  sellerName,
  profileUrl,
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

  // Top zone (image) — 60% of height.
  const imgZoneH = Math.round(H * 0.6)
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
  ctx.fillStyle = '#0c0c1e'
  ctx.fillRect(0, panelY, W, panelH)

  const pad = 64
  const contentW = W - pad * 2
  let cursorY = panelY + 56

  // Title (max 2 lines).
  ctx.fillStyle = '#f5f0e6'
  ctx.font = 'bold 56px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  const titleLines = wrapLines(ctx, listing?.title || '', contentW, 2)
  for (const line of titleLines) {
    ctx.fillText(line, pad, cursorY)
    cursorY += 64
  }
  cursorY += 8

  // Species (italic, 1 line).
  if (listing?.speciesName) {
    ctx.fillStyle = 'rgba(245, 240, 230, 0.72)'
    ctx.font = 'italic 30px sans-serif'
    const speciesLines = wrapLines(ctx, listing.speciesName, contentW, 1)
    if (speciesLines[0]) {
      ctx.fillText(speciesLines[0], pad, cursorY)
      cursorY += 40
    }
  }

  // Price (gold).
  const priceText = formatListingPrice(listing?.priceAmount, listing?.currency, t)
  ctx.fillStyle = '#d4af37'
  ctx.font = 'bold 64px sans-serif'
  ctx.fillText(priceText, pad, panelY + panelH - 220)

  // Seller handle / location.
  const sellerLabel = sellerHandle
    ? `@${String(sellerHandle).replace(/^@+/, '')}`
    : (sellerName || '')
  if (sellerLabel) {
    ctx.fillStyle = 'rgba(245, 240, 230, 0.6)'
    ctx.font = '28px sans-serif'
    ctx.fillText(sellerLabel, pad, panelY + panelH - 140)
  }

  // Brand mark (bottom-right).
  ctx.fillStyle = 'rgba(245, 240, 230, 0.55)'
  ctx.font = '24px sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(`via ${BRAND_WITH_TM}`, W - pad, panelY + panelH - 64)

  // Brand logo (above the "via TarantulApp" line, when available).
  try {
    const logo = await loadImageElement(BRAND_LOGO_FOR_LIGHT_BG)
    const logoSize = 64
    const lx = W - pad - logoSize
    const ly = panelY + panelH - 64 - logoSize - 16
    ctx.save()
    ctx.fillStyle = 'rgba(245, 240, 230, 0.95)'
    ctx.beginPath()
    ctx.arc(lx + logoSize / 2, ly + logoSize / 2, logoSize / 2 + 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.save()
    ctx.beginPath()
    ctx.arc(lx + logoSize / 2, ly + logoSize / 2, logoSize / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(logo, lx, ly, logoSize, logoSize)
    ctx.restore()
    ctx.restore()
  } catch {
    /* no logo, oh well */
  }

  // Faint URL on the bottom-left if room.
  if (profileUrl) {
    ctx.fillStyle = 'rgba(245, 240, 230, 0.4)'
    ctx.font = '22px sans-serif'
    ctx.textAlign = 'left'
    const urlLine = String(profileUrl).replace(/^https?:\/\//, '')
    ctx.fillText(urlLine, pad, panelY + panelH - 64)
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
        t,
      })
    }
    throw err
  }
}
