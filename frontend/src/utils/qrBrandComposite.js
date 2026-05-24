import QRCode from 'qrcode'
import { BRAND_WITH_TM } from '../constants/brand'
import { sanitizeFilename, shareOrDownloadDataUrl } from './shareOrDownloadBlob'

/** Logo sobre fondo claro (QR / Excel / Word en blanco). */
export const BRAND_LOGO_FOR_LIGHT_BG = '/logo-black.png?v=2'

export const QR_CENTER_LOGO_FRACTION = 0.35

/** Lado del QR en px dentro de la etiqueta impresa (escala DOCX desde aquí). */
export const LABEL_QR_PX = 152

const LAYOUT = {
  pad: 8,
  qrTextGap: 10,
  textColW: 196,
  titleSize: 14,
  titleLineH: 17,
  speciesSize: 11,
  speciesLineH: 14,
  factSize: 10,
  factLineH: 12,
  gapBeforeLogo: 4,
  markSize: 22,
  markBottomPad: 5,
  maxTitleLines: 2,
  maxSpeciesLines: 2,
}

export function qrCenterLogoDiameterPx(qrSizePx, fraction = QR_CENTER_LOGO_FRACTION) {
  return Math.max(8, Math.round(qrSizePx * fraction))
}

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

/** @deprecated use LABEL_QR_PX — kept for callers that import FULL_LABEL_LAYOUT */
export const FULL_LABEL_LAYOUT = {
  canvasW: LAYOUT.pad * 2 + LABEL_QR_PX + LAYOUT.qrTextGap + LAYOUT.textColW,
  canvasH: LAYOUT.pad * 2 + LABEL_QR_PX + LAYOUT.gapBeforeLogo + LAYOUT.markSize + LAYOUT.markBottomPad,
  qrSize: LABEL_QR_PX,
  qrTop: LAYOUT.pad,
}

export function labelDocxDimensions(layoutDims, displayQrPx) {
  const { canvasW, canvasH, qrSize } = layoutDims
  const scale = displayQrPx / qrSize
  return {
    width: Math.round(canvasW * scale),
    height: Math.round(canvasH * scale),
  }
}

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

function layoutTextBlock(ctx, { nameLine, speciesLine, factLines, textW }) {
  const L = LAYOUT
  const blocks = []

  ctx.font = `bold ${L.titleSize}px sans-serif`
  const titleLines = wrapLinesToWidth(ctx, nameLine, textW).slice(0, L.maxTitleLines)
  if (titleLines.length) {
    blocks.push({ lines: titleLines, lineH: L.titleLineH, color: '#111', font: `bold ${L.titleSize}px sans-serif` })
  }

  ctx.font = `italic ${L.speciesSize}px sans-serif`
  const speciesLines = wrapLinesToWidth(ctx, speciesLine, textW).slice(0, L.maxSpeciesLines)
  if (speciesLines.length) {
    blocks.push({
      lines: speciesLines,
      lineH: L.speciesLineH,
      color: '#444',
      font: `italic ${L.speciesSize}px sans-serif`,
      gapBefore: titleLines.length ? 3 : 0,
    })
  }

  ctx.font = `${L.factSize}px sans-serif`
  const factWrapped = []
  for (const fact of Array.isArray(factLines) ? factLines : []) {
    const sub = wrapLinesToWidth(ctx, fact, textW)
    factWrapped.push(...sub)
  }
  if (factWrapped.length) {
    blocks.push({
      lines: factWrapped,
      lineH: L.factLineH,
      color: '#222',
      font: `${L.factSize}px sans-serif`,
      gapBefore: blocks.length ? 4 : 0,
    })
  }

  let h = 0
  for (const b of blocks) {
    h += b.gapBefore || 0
    h += b.lines.length * b.lineH
  }
  return { blocks, height: h }
}

function measureLabelSize(ctx, { nameLine, speciesLine, factLines, qrSize }) {
  const L = LAYOUT
  const textW = L.textColW
  const { height: textH } = layoutTextBlock(ctx, { nameLine, speciesLine, factLines, textW })
  const bodyH = Math.max(qrSize, textH)
  const W = L.pad + qrSize + L.qrTextGap + textW + L.pad
  const H = L.pad + bodyH + L.gapBeforeLogo + L.markSize + L.markBottomPad
  return { W, H, bodyH, textW, textH }
}

function drawTextBlocks(ctx, x, y, blocks) {
  let cy = y
  for (const b of blocks) {
    cy += b.gapBefore || 0
    ctx.font = b.font
    ctx.fillStyle = b.color
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    for (const ln of b.lines) {
      ctx.fillText(ln, x, cy)
      cy += b.lineH
    }
  }
  return cy
}

async function drawFooterLogo(ctx, W, H) {
  const L = LAYOUT
  const y = H - L.markBottomPad - L.markSize
  try {
    const mark = await loadImageElement(BRAND_LOGO_FOR_LIGHT_BG)
    ctx.drawImage(mark, W / 2 - L.markSize / 2, y, L.markSize, L.markSize)
  } catch {
    ctx.fillStyle = '#888'
    ctx.font = '9px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(BRAND_WITH_TM, W / 2, y + L.markSize / 2)
  }
}

async function drawHorizontalLabel(ctx, W, H, {
  composed,
  qrSize,
  nameLine,
  speciesLine,
  factLines,
}) {
  const L = LAYOUT
  const textX = L.pad + qrSize + L.qrTextGap
  const { blocks, height: textH } = layoutTextBlock(ctx, {
    nameLine,
    speciesLine,
    factLines,
    textW: L.textColW,
  })
  const bodyH = Math.max(qrSize, textH)
  const qrY = L.pad

  const qrImg = await loadImageElement(composed)
  ctx.drawImage(qrImg, L.pad, qrY, qrSize, qrSize)
  drawTextBlocks(ctx, textX, qrY, blocks)
  await drawFooterLogo(ctx, W, H)
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

/**
 * PNG de etiqueta horizontal: QR izquierda, texto derecha, logo abajo.
 * @returns {Promise<{ dataUrl: string, width: number, height: number, layoutDims: object }>}
 */
export async function buildFullLabelPngDataUrl({
  url,
  nameLine,
  speciesLine,
  factLines = null,
  normalizeHeight = null,
  /** @deprecated ignored — internal ID removed from terrarium labels */
  shortIdLine: _shortIdLine,
  /** @deprecated NW/OW inline in care facts */
  worldBadgeInfo: _worldBadgeInfo,
}) {
  const hasFacts = Array.isArray(factLines) && factLines.length > 0
  const qrSize = LABEL_QR_PX

  const raw = await QRCode.toDataURL(url, {
    width: qrSize,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#FFFFFF' },
  })
  const composed = await compositeQrPngDataUrl(raw, qrSize)

  const measureCanvas = document.createElement('canvas')
  const mctx = measureCanvas.getContext('2d')
  let { W, H } = measureLabelSize(mctx, {
    nameLine,
    speciesLine,
    factLines: hasFacts ? factLines : null,
    qrSize,
  })

  const targetH = normalizeHeight != null ? Math.max(H, normalizeHeight) : H
  const layoutDims = { canvasW: W, canvasH: targetH, qrSize }

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

  await drawHorizontalLabel(ctx, W, H, {
    composed,
    qrSize,
    nameLine,
    speciesLine,
    factLines: hasFacts ? factLines : null,
  })

  if (padTop > 0) ctx.restore()

  drawCutBorder(ctx, W, targetH)

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: W,
    height: targetH,
    layoutDims,
  }
}

export async function downloadBrandedQrPng({
  url,
  nameLine,
  speciesLine,
  factLines = null,
  filenameBase,
  shortIdLine,
  worldBadgeInfo,
}) {
  const { dataUrl } = await buildFullLabelPngDataUrl({
    url,
    nameLine,
    speciesLine,
    factLines,
    shortIdLine,
    worldBadgeInfo,
  })
  const safeName = sanitizeFilename(filenameBase || 'qr')
  await shareOrDownloadDataUrl(dataUrl, `${safeName}-QR.png`, {
    mimeType: 'image/png',
    title: `${safeName} QR`,
    dialogTitle: `${safeName} QR`,
  })
}
