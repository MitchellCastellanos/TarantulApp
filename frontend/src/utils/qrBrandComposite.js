import QRCode from 'qrcode'

/** Logo sobre fondo claro (QR / Excel / Word en blanco). */
export const BRAND_LOGO_FOR_LIGHT_BG = '/logo-black.png?v=2'

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
 * Usa corrección H en el QR previo a composición vía {@link prepareQrDataUrlForComposite}.
 */
export async function compositeQrPngDataUrl(qrDataUrl, rasterSize, logoFraction = 0.22) {
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
  const lw = Math.max(18, Math.round(rasterSize * logoFraction))
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
 * PNG listo para descargar: QR con logo centrado + nombre + especie + logo pequeño abajo.
 */
export async function downloadBrandedQrPng({
  url,
  nameLine,
  speciesLine,
  shortIdLine,
  filenameBase,
}) {
  const qrSize = 240
  const W = 320
  const H = 380
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
  ctx.drawImage(qrImg, ox, 14, qrSize, qrSize)

  ctx.fillStyle = '#111'
  ctx.font = 'bold 15px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(nameLine, W / 2, qrSize + 44)

  ctx.fillStyle = '#444'
  ctx.font = '12px sans-serif'
  ctx.fillText(speciesLine, W / 2, qrSize + 66)

  if (shortIdLine) {
    ctx.fillStyle = '#777'
    ctx.font = '11px sans-serif'
    ctx.fillText(shortIdLine, W / 2, qrSize + 86)
  }

  try {
    const mark = await loadImageElement(BRAND_LOGO_FOR_LIGHT_BG)
    const lw = 34
    ctx.drawImage(mark, W / 2 - lw / 2, H - lw - 10, lw, lw)
  } catch {
    ctx.fillStyle = '#888'
    ctx.font = '11px sans-serif'
    ctx.fillText('TarantulApp', W / 2, H - 14)
  }

  const safeName = String(filenameBase || 'qr').replace(/[/\\?%*:|"<>]/g, '-')
  const link = document.createElement('a')
  link.download = `${safeName}-QR.png`
  link.href = canvas.toDataURL('image/png')
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}
