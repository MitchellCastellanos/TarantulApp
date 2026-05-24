import QRCode from 'qrcode'
import { BRAND_WITH_TM } from '../constants/brand'
import { sanitizeFilename, shareOrDownloadDataUrl } from './shareOrDownloadBlob'

/** Logo sobre fondo claro (QR / Excel / Word en blanco). */
export const BRAND_LOGO_FOR_LIGHT_BG = '/logo-black.png?v=2'

/**
 * Fracción del lado del QR para el logo centrado (corrección H).
 * ~30–35% suele seguir escaneando bien en móvil con URLs cortas.
 */
export const QR_CENTER_LOGO_FRACTION = 0.35

export function qrCenterLogoDiameterPx(qrSizePx, fraction = QR_CENTER_LOGO_FRACTION) {
  return Math.max(8, Math.round(qrSizePx * fraction))
}

/** Estilos del `<img>` del logo superpuesto en previsualizaciones SVG/React. */
export function qrCenterLogoOverlayStyles(qrSizePx, fraction = QR_CENTER_LOGO_FRACTION) {
  const d = qrCenterLogoDiameterPx(qrSizePx, fraction)
  const pad = Math.max(2, Math.round(d * 0.08))
  const ring = Math.max(2, Math.round(d * 0.03))
  return {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: d,
    height: d,
    objectFit: 'contain',
    borderRadius: '50%',
    background: '#fff',
    padding: pad,
    boxShadow: `0 0 0 ${ring}px #fff`,
  }
}

export function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })
}

/**
 * Pega el logo circular al centro del QR (PNG data URL o canvas).
 * El bitmap del QR debe generarse con corrección de errores H.
 * @param {number} [logoFraction] — lado del logo / lado del QR (por defecto {@link QR_CENTER_LOGO_FRACTION}).
 */
export async function compositeQrPngDataUrl(qrDataUrl, rasterSize, logoFraction = QR_CENTER_LOGO_FRACTION) {
  const canvas = document.createElement('canvas')
  canvas.width = rasterSize
  canvas.height = rasterSize
  const ctx = canvas.getContext('2d')
  const qrImg = await loadImageElement(qrDataUrl)
  ctx.drawImage(qrImg, 0, 0, rasterSize, rasterSize)
  let logo
  try {
    logo = await loadImageElement(BRAND_LOGO_FOR_LIGHT_BG)
  } catch {
    return canvas.toDataURL('image/png')
  }
  const lw = Math.max(14, Math.round(rasterSize * logoFraction))
  const lx = (rasterSize - lw) / 2
  const ly = (rasterSize - lw) / 2
  const pad = Math.max(2, Math.round(lw * 0.08))
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(lx + lw / 2, ly + lw / 2, lw / 2 + pad, 0, Math.PI * 2)
  ctx.fill()
  ctx.save()
  ctx.beginPath()
  ctx.arc(lx + lw / 2, ly + lw / 2, lw / 2, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(logo, lx, ly, lw, lw)
  ctx.restore()
  return canvas.toDataURL('image/png')
}

/**
 * Dimensiones internas de la etiqueta completa (legacy, sin care facts).
 * El lado del QR en píxeles encaja con el tamaño elegido en cm al exportar DOCX.
 */
export const FULL_LABEL_LAYOUT = {
  canvasW: 320,
  canvasH: 430,
  qrSize: 224,
  qrTop: 5,
}

/** Layout tight cuando hay care facts (ancho = QR + padding lateral). */
export const CARE_LABEL_LAYOUT = {
  HPAD: 14,
  qrSize: 224,
  qrTop: 5,
  textPad: 10,
  gapAfterQr: 14,
  badgeH: 22,
  badgeGap: 8,
  factLineH: 16,
  gapBeforeLogo: 8,
  markSize: 30,
  markBottomPad: 10,
}

/** Ancho/alto en px “docx” si el QR debe medir `displayQrPx` al imprimir. */
export function labelDocxDimensions(layoutDims, displayQrPx) {
  const { canvasW, canvasH, qrSize } = layoutDims
  const scale = displayQrPx / qrSize
  return {
    width: Math.round(canvasW * scale),
    height: Math.round(canvasH * scale),
  }
}

/** Parte texto en líneas que caben en maxWidth (palabras; tokens largos se cortan con …). */
export function wrapLinesToWidth(ctx, text, maxWidth) {
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
    if (line) {
      lines.push(line.trimEnd())
      line = ''
    }
    if (ctx.measureText(word).width <= maxWidth) {
      line = word
    } else {
      let w = word
      const ell = '…'
      while (w.length > 1 && ctx.measureText(w + ell).width > maxWidth) {
        w = w.slice(0, -1)
      }
      lines.push(w + (w.length < word.length ? ell : ''))
    }
  }
  if (line) lines.push(line.trimEnd())
  return lines
}

function truncateLineToWidth(ctx, text, maxWidth) {
  const raw = String(text ?? '').trim()
  if (!raw) return ''
  if (ctx.measureText(raw).width <= maxWidth) return raw
  const ell = '…'
  let w = raw
  while (w.length > 1 && ctx.measureText(w + ell).width > maxWidth) {
    w = w.slice(0, -1)
  }
  return w + ell
}

function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rad, y)
  ctx.arcTo(x + w, y, x + w, y + h, rad)
  ctx.arcTo(x + w, y + h, x, y + h, rad)
  ctx.arcTo(x, y + h, x, y, rad)
  ctx.arcTo(x, y, x + w, y, rad)
  ctx.closePath()
}

function drawCutBorder(ctx, W, H) {
  const inset = 2
  ctx.save()
  ctx.strokeStyle = '#222222'
  ctx.lineWidth = 1
  ctx.setLineDash([3, 3])
  ctx.strokeRect(inset + 0.5, inset + 0.5, W - inset * 2 - 1, H - inset * 2 - 1)
  ctx.restore()
}

function measureCareLabelHeight(ctx, {
  W,
  maxTextW,
  nameLine,
  speciesLine,
  shortIdLine,
  factLines,
  worldBadgeInfo,
}) {
  const L = CARE_LABEL_LAYOUT
  let y = L.qrTop + L.qrSize + L.gapAfterQr

  ctx.font = 'bold 19px sans-serif'
  const nameLines = wrapLinesToWidth(ctx, nameLine, maxTextW).slice(0, 2)
  y += nameLines.length * 22 + (nameLines.length ? 6 : 0)

  ctx.font = 'italic 15px sans-serif'
  const speciesLines = wrapLinesToWidth(ctx, speciesLine, maxTextW).slice(0, 3)
  y += speciesLines.length * 18 + (speciesLines.length ? 4 : 0)

  if (shortIdLine) y += 14

  if (worldBadgeInfo) y += L.badgeH + L.badgeGap

  ctx.font = '12px sans-serif'
  const facts = Array.isArray(factLines) ? factLines : []
  y += facts.length * L.factLineH

  y += L.gapBeforeLogo + L.markSize + L.markBottomPad
  return Math.ceil(y)
}

async function drawLegacyLabel(ctx, W, H, { composed, nameLine, speciesLine, shortIdLine }) {
  const { qrSize, qrTop } = FULL_LABEL_LAYOUT
  const qrImg = await loadImageElement(composed)
  const ox = (W - qrSize) / 2
  ctx.drawImage(qrImg, ox, qrTop, qrSize, qrSize)

  const textPad = 10
  const maxTextW = W - textPad * 2
  const baseY = qrTop + qrSize
  const nameLineH = 22
  const speciesLineH = 18
  const markSize = Math.round(30 * (W / 320))
  const markBottomPad = 10

  ctx.textAlign = 'center'
  ctx.fillStyle = '#111'
  ctx.font = 'bold 19px sans-serif'
  const nameLines = wrapLinesToWidth(ctx, nameLine, maxTextW).slice(0, 2)
  let y = baseY + 22
  nameLines.forEach((ln, i) => {
    ctx.fillText(ln, W / 2, y + i * nameLineH)
  })
  y += nameLines.length * nameLineH + (nameLines.length ? 6 : 0)

  ctx.fillStyle = '#444'
  ctx.font = 'italic 15px sans-serif'
  const speciesLines = wrapLinesToWidth(ctx, speciesLine, maxTextW).slice(0, 3)
  speciesLines.forEach((ln, i) => {
    ctx.fillText(ln, W / 2, y + i * speciesLineH)
  })
  y += speciesLines.length * speciesLineH + (speciesLines.length ? 4 : 0)

  if (shortIdLine) {
    ctx.fillStyle = '#777'
    ctx.font = '11px sans-serif'
    ctx.fillText(String(shortIdLine).trim(), W / 2, y + 14)
  }

  try {
    const mark = await loadImageElement(BRAND_LOGO_FOR_LIGHT_BG)
    const lw = markSize
    ctx.drawImage(mark, W / 2 - lw / 2, H - lw - markBottomPad, lw, lw)
  } catch {
    ctx.fillStyle = '#888'
    ctx.font = '11px sans-serif'
    ctx.fillText(BRAND_WITH_TM, W / 2, H - 12)
  }
}

async function drawCareLabel(ctx, W, H, {
  composed,
  nameLine,
  speciesLine,
  shortIdLine,
  factLines,
  worldBadgeInfo,
}) {
  const L = CARE_LABEL_LAYOUT
  const { qrSize, qrTop, HPAD } = L
  const textPad = L.textPad
  const maxTextW = W - textPad * 2

  const qrImg = await loadImageElement(composed)
  ctx.drawImage(qrImg, HPAD, qrTop, qrSize, qrSize)

  ctx.textAlign = 'center'
  let y = qrTop + qrSize + L.gapAfterQr

  ctx.fillStyle = '#111'
  ctx.font = 'bold 19px sans-serif'
  const nameLines = wrapLinesToWidth(ctx, nameLine, maxTextW).slice(0, 2)
  nameLines.forEach((ln, i) => {
    ctx.fillText(ln, W / 2, y + i * 22)
  })
  y += nameLines.length * 22 + (nameLines.length ? 6 : 0)

  ctx.fillStyle = '#444'
  ctx.font = 'italic 15px sans-serif'
  const speciesLines = wrapLinesToWidth(ctx, speciesLine, maxTextW).slice(0, 3)
  speciesLines.forEach((ln, i) => {
    ctx.fillText(ln, W / 2, y + i * 18)
  })
  y += speciesLines.length * 18 + (speciesLines.length ? 4 : 0)

  if (shortIdLine) {
    ctx.fillStyle = '#777'
    ctx.font = '11px sans-serif'
    ctx.fillText(String(shortIdLine).trim(), W / 2, y + 14)
    y += 14
  }

  if (worldBadgeInfo?.label) {
    ctx.font = 'bold 11px sans-serif'
    const padX = 10
    const tw = ctx.measureText(worldBadgeInfo.label).width
    const bw = tw + padX * 2
    const bx = (W - bw) / 2
    const by = y
    ctx.fillStyle = worldBadgeInfo.bg || '#333'
    roundRect(ctx, bx, by, bw, L.badgeH, 4)
    ctx.fill()
    ctx.fillStyle = worldBadgeInfo.fg || '#fff'
    ctx.fillText(worldBadgeInfo.label, W / 2, by + L.badgeH / 2 + 4)
    y += L.badgeH + L.badgeGap
  }

  ctx.fillStyle = '#333'
  ctx.font = '12px sans-serif'
  const facts = Array.isArray(factLines) ? factLines : []
  facts.forEach((line) => {
    const clipped = truncateLineToWidth(ctx, line, maxTextW)
    if (clipped) {
      ctx.fillText(clipped, W / 2, y + 12)
      y += L.factLineH
    }
  })

  y += L.gapBeforeLogo
  try {
    const mark = await loadImageElement(BRAND_LOGO_FOR_LIGHT_BG)
    const lw = L.markSize
    ctx.drawImage(mark, W / 2 - lw / 2, H - lw - L.markBottomPad, lw, lw)
  } catch {
    ctx.fillStyle = '#888'
    ctx.font = '11px sans-serif'
    ctx.fillText(BRAND_WITH_TM, W / 2, H - 12)
  }
}

/**
 * PNG de etiqueta: QR + nombre + especie + ID + logo + borde de recorte.
 * @returns {Promise<{ dataUrl: string, width: number, height: number, layoutDims: { canvasW: number, canvasH: number, qrSize: number } }>}
 */
export async function buildFullLabelPngDataUrl({
  url,
  nameLine,
  speciesLine,
  shortIdLine,
  factLines = null,
  worldBadgeInfo = null,
  normalizeHeight = null,
}) {
  const hasCareBlock =
    (Array.isArray(factLines) && factLines.length > 0) || Boolean(worldBadgeInfo)

  const raw = await QRCode.toDataURL(url, {
    width: hasCareBlock ? CARE_LABEL_LAYOUT.qrSize : FULL_LABEL_LAYOUT.qrSize,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#FFFFFF' },
  })
  const qrSize = hasCareBlock ? CARE_LABEL_LAYOUT.qrSize : FULL_LABEL_LAYOUT.qrSize
  const composed = await compositeQrPngDataUrl(raw, qrSize)

  let W
  let H
  let layoutDims

  if (!hasCareBlock) {
    W = FULL_LABEL_LAYOUT.canvasW
    H = FULL_LABEL_LAYOUT.canvasH
    layoutDims = { canvasW: W, canvasH: H, qrSize: FULL_LABEL_LAYOUT.qrSize }
  } else {
    const L = CARE_LABEL_LAYOUT
    W = L.qrSize + L.HPAD * 2
    const measureCanvas = document.createElement('canvas')
    const mctx = measureCanvas.getContext('2d')
    const maxTextW = W - L.textPad * 2
    H = measureCareLabelHeight(mctx, {
      W,
      maxTextW,
      nameLine,
      speciesLine,
      shortIdLine,
      factLines,
      worldBadgeInfo,
    })
    layoutDims = { canvasW: W, canvasH: H, qrSize: L.qrSize }
  }

  const targetH = normalizeHeight != null ? Math.max(H, normalizeHeight) : H

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, targetH)

  const padTop = normalizeHeight != null && targetH > H ? Math.floor((targetH - H) / 2) : 0
  if (padTop > 0) {
    ctx.save()
    ctx.translate(0, padTop)
  }

  if (!hasCareBlock) {
    await drawLegacyLabel(ctx, W, H, { composed, nameLine, speciesLine, shortIdLine })
  } else {
    await drawCareLabel(ctx, W, H, {
      composed,
      nameLine,
      speciesLine,
      shortIdLine,
      factLines,
      worldBadgeInfo,
    })
  }

  if (padTop > 0) ctx.restore()

  drawCutBorder(ctx, W, targetH)

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: W,
    height: targetH,
    layoutDims: { ...layoutDims, canvasH: targetH },
  }
}

/**
 * PNG listo para descargar: QR con logo centrado + nombre + especie + logo pequeño abajo.
 */
export async function downloadBrandedQrPng({
  url,
  nameLine,
  speciesLine,
  shortIdLine,
  factLines = null,
  worldBadgeInfo = null,
  filenameBase,
}) {
  const { dataUrl } = await buildFullLabelPngDataUrl({
    url,
    nameLine,
    speciesLine,
    shortIdLine,
    factLines,
    worldBadgeInfo,
  })
  const safeName = sanitizeFilename(filenameBase || 'qr')
  await shareOrDownloadDataUrl(dataUrl, `${safeName}-QR.png`, {
    mimeType: 'image/png',
    title: `${safeName} QR`,
    dialogTitle: `${safeName} QR`,
  })
}
