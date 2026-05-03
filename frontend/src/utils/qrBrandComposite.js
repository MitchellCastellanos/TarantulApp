import QRCode from 'qrcode'
import { BRAND_WITH_TM } from '../constants/brand'

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
 * Dimensiones internas de la etiqueta completa (una sola unidad: QR + texto + logo + borde de corte).
 * El lado del QR en píxeles encaja con el tamaño elegido en cm al exportar DOCX.
 */
export const FULL_LABEL_LAYOUT = {
  canvasW: 320,
  canvasH: 380,
  /** Un poco menor que antes para dar aire al nombre/especie sin agrandar la etiqueta impresa. */
  qrSize: 228,
  /** Poco margen blanco entre el borde de recorte y el QR (similar a etiqueta física). */
  qrTop: 5,
}

/** Ancho/alto en px “docx” si el QR debe medir `displayQrPx` al imprimir. */
export function labelDocxDimensions(displayQrPx) {
  const { canvasW, canvasH, qrSize } = FULL_LABEL_LAYOUT
  const scale = displayQrPx / qrSize
  return {
    width: Math.round(canvasW * scale),
    height: Math.round(canvasH * scale),
  }
}

function fillTextTruncatedCenter(ctx, text, centerX, y, maxWidth) {
  const t = String(text ?? '')
  if (!t) return
  if (ctx.measureText(t).width <= maxWidth) {
    ctx.fillText(t, centerX, y)
    return
  }
  let s = t
  const ell = '…'
  while (s.length > 1 && ctx.measureText(s + ell).width > maxWidth) {
    s = s.slice(0, -1)
  }
  ctx.fillText(s + ell, centerX, y)
}

/**
 * PNG (data URL) de la etiqueta completa: QR + nombre + especie + ID + logo + línea de recorte punteada.
 * Una sola imagen evita que Word mueva el texto respecto al QR al usar diseño flexible.
 */
export async function buildFullLabelPngDataUrl({
  url,
  nameLine,
  speciesLine,
  shortIdLine,
}) {
  const { canvasW: W, canvasH: H, qrSize, qrTop } = FULL_LABEL_LAYOUT
  const raw = await QRCode.toDataURL(url, {
    width: qrSize,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#FFFFFF' },
  })
  const composed = await compositeQrPngDataUrl(raw, qrSize)

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  const qrImg = await loadImageElement(composed)
  const ox = (W - qrSize) / 2
  ctx.drawImage(qrImg, ox, qrTop, qrSize, qrSize)

  const textPad = 10
  const maxTextW = W - textPad * 2
  const baseY = qrTop + qrSize

  ctx.textAlign = 'center'
  ctx.fillStyle = '#111'
  ctx.font = 'bold 19px sans-serif'
  fillTextTruncatedCenter(ctx, nameLine, W / 2, baseY + 24, maxTextW)

  ctx.fillStyle = '#444'
  ctx.font = 'italic 15px sans-serif'
  fillTextTruncatedCenter(ctx, speciesLine, W / 2, baseY + 50, maxTextW)

  if (shortIdLine) {
    ctx.fillStyle = '#777'
    ctx.font = '11px sans-serif'
    fillTextTruncatedCenter(ctx, shortIdLine, W / 2, baseY + 74, maxTextW)
  }

  try {
    const mark = await loadImageElement(BRAND_LOGO_FOR_LIGHT_BG)
    const lw = 28
    ctx.drawImage(mark, W / 2 - lw / 2, H - lw - 7, lw, lw)
  } catch {
    ctx.fillStyle = '#888'
    ctx.font = '11px sans-serif'
    ctx.fillText(BRAND_WITH_TM, W / 2, H - 12)
  }

  const inset = 2
  ctx.save()
  ctx.strokeStyle = '#222222'
  ctx.lineWidth = 1
  ctx.setLineDash([3, 3])
  ctx.strokeRect(inset + 0.5, inset + 0.5, W - inset * 2 - 1, H - inset * 2 - 1)
  ctx.restore()

  return canvas.toDataURL('image/png')
}

/**
 * PNG listo para descargar: QR con logo centrado + nombre + especie + logo pequeño abajo.
 */
export async function downloadBrandedQrPng({
  url,
  nameLine,
  speciesLine,
  shortIdLine,
  filenameBase,
}) {
  const href = await buildFullLabelPngDataUrl({
    url,
    nameLine,
    speciesLine,
    shortIdLine,
  })
  const safeName = String(filenameBase || 'qr').replace(/[/\\?%*:|"<>]/g, '-')
  const link = document.createElement('a')
  link.download = `${safeName}-QR.png`
  link.href = href
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}
