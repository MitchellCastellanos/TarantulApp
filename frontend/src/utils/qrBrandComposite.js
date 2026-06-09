import QRCode from 'qrcode'
import { imgUrl } from '../services/api'
import { sanitizeFilename, shareOrDownloadDataUrl } from './shareOrDownloadBlob'
import {
  DEFAULT_VENDOR_LABEL_SIZE_ID,
  resolveVendorLabelSizePreset,
  vendorLabelCanvasPx,
} from './labelSizes'

/** Logo sobre fondo claro (QR / Excel / Word en blanco). */
export const BRAND_LOGO_FOR_LIGHT_BG = '/logo-black.png?v=2'

export const QR_CENTER_LOGO_FRACTION = 0.35

/** QR en etiqueta simple (protagonista, layout vertical). */
export const SIMPLE_LABEL_QR_PX = 224

/** QR en etiqueta con care facts (layout horizontal). */
export const CARE_LABEL_QR_PX = 152

/** Label layout modes (simple / care / vendor-passport). */
export const LABEL_LAYOUT_MODES = /** @type {const} */ ({
  SIMPLE: 'simple',
  CARE: 'care',
  VENDOR_PASSPORT: 'vendor-passport',
})

const TA_POWERED_BY = 'Powered by TarantulApp™'
const VERIFIED_ORIGIN_LABEL = 'Verified Origin'

const SIMPLE = {
  pad: 8,
  qrTop: 5,
  gapAfterQr: 10,
  textPad: 10,
  titleSize: 19,
  titleLineH: 22,
  speciesSize: 15,
  speciesLineH: 18,
  maxTitleLines: 2,
  maxSpeciesLines: 3,
  captionSize: 12,
  captionLineH: 15,
  maxCaptionLines: 2,
  captionGapBefore: 5,
}

const CARE = {
  pad: 8,
  qrTextGap: 10,
  textColW: 204,
  titleSize: 16,
  titleLineH: 19,
  speciesSize: 12,
  speciesLineH: 15,
  factSize: 12,
  factLineH: 14,
  factGapBefore: 5,
  maxTitleLines: 2,
  maxSpeciesLines: 2,
  captionSize: 11,
  captionLineH: 13,
  maxCaptionLines: 2,
  captionGapBefore: 4,
}

/** @deprecated — use SIMPLE_LABEL_QR_PX / layoutDims from buildFullLabelPngDataUrl */
export const LABEL_QR_PX = SIMPLE_LABEL_QR_PX

export const FULL_LABEL_LAYOUT = {
  get canvasW() {
    return SIMPLE.pad * 2 + SIMPLE_LABEL_QR_PX
  },
  get canvasH() {
    return (
      SIMPLE.pad +
      SIMPLE_LABEL_QR_PX +
      SIMPLE.gapAfterQr +
      SIMPLE.titleLineH * 2 +
      SIMPLE.speciesLineH +
      SIMPLE.pad
    )
  },
  qrSize: SIMPLE_LABEL_QR_PX,
  qrTop: SIMPLE.qrTop,
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

/** True for absolute http(s) URLs pointing at a different origin (need CORS to stay canvas-safe). */
function isCrossOrigin(src) {
  if (typeof src !== 'string' || !/^https?:\/\//i.test(src)) return false
  try {
    return new URL(src, window.location.href).origin !== window.location.origin
  } catch {
    return false
  }
}

export function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Remote brand logos (e.g. Cloudinary) must be CORS-loaded or canvas.toDataURL() taints.
    if (isCrossOrigin(src)) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`))
    img.src = src
  })
}

export async function compositeQrPngDataUrl(
  qrDataUrl,
  rasterSize,
  logoFraction = QR_CENTER_LOGO_FRACTION,
  logoSrc = BRAND_LOGO_FOR_LIGHT_BG,
) {
  const canvas = document.createElement('canvas')
  canvas.width = rasterSize
  canvas.height = rasterSize
  const ctx = canvas.getContext('2d')
  const qrImg = await loadImageElement(qrDataUrl)
  ctx.drawImage(qrImg, 0, 0, rasterSize, rasterSize)
  let logo
  try {
    logo = await loadImageElement(logoSrc || BRAND_LOGO_FOR_LIGHT_BG)
  } catch {
    // A custom brand logo that fails to load (e.g. CORS) should not drop the QR — fall back
    // to the TarantulApp mark so the label still carries a center brand.
    if (logoSrc && logoSrc !== BRAND_LOGO_FOR_LIGHT_BG) {
      try {
        logo = await loadImageElement(BRAND_LOGO_FOR_LIGHT_BG)
      } catch {
        return canvas.toDataURL('image/png')
      }
    } else {
      return canvas.toDataURL('image/png')
    }
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

function measureSimpleVertical(ctx, { nameLine, speciesLine, captionLine, qrSize }) {
  const S = SIMPLE
  const maxTextW = qrSize
  ctx.font = `bold ${S.titleSize}px sans-serif`
  const nameLines = wrapLinesToWidth(ctx, nameLine, maxTextW).slice(0, S.maxTitleLines)
  ctx.font = `italic ${S.speciesSize}px sans-serif`
  const speciesLines = wrapLinesToWidth(ctx, speciesLine, maxTextW).slice(0, S.maxSpeciesLines)
  ctx.font = `${S.captionSize}px sans-serif`
  const captionLines = captionLine
    ? wrapLinesToWidth(ctx, captionLine, maxTextW).slice(0, S.maxCaptionLines)
    : []

  let textBlockH = 0
  if (nameLines.length) textBlockH += nameLines.length * S.titleLineH + 4
  if (speciesLines.length) textBlockH += speciesLines.length * S.speciesLineH
  if (captionLines.length) textBlockH += S.captionGapBefore + captionLines.length * S.captionLineH

  const W = qrSize + S.pad * 2
  const H = S.pad + qrSize + (textBlockH > 0 ? S.gapAfterQr + textBlockH : 0) + S.pad

  return { W, H, nameLines, speciesLines, captionLines, maxTextW }
}

function measureCareHorizontal(ctx, { nameLine, speciesLine, factLines, captionLine, qrSize, partnerLogoReserve = 0 }) {
  const C = CARE
  const textW = Math.max(120, C.textColW - partnerLogoReserve)

  ctx.font = `bold ${C.titleSize}px sans-serif`
  const titleLines = wrapLinesToWidth(ctx, nameLine, textW).slice(0, C.maxTitleLines)
  ctx.font = `italic ${C.speciesSize}px sans-serif`
  const speciesLines = wrapLinesToWidth(ctx, speciesLine, textW).slice(0, C.maxSpeciesLines)

  ctx.font = `${C.factSize}px sans-serif`
  let factLineCount = 0
  for (const fact of factLines) {
    factLineCount += wrapLinesToWidth(ctx, fact, textW).length
  }

  ctx.font = `${C.captionSize}px sans-serif`
  const captionLines = captionLine
    ? wrapLinesToWidth(ctx, captionLine, textW).slice(0, C.maxCaptionLines)
    : []

  let textH = 0
  if (titleLines.length) textH += titleLines.length * C.titleLineH + 3
  if (speciesLines.length) textH += speciesLines.length * C.speciesLineH
  if (factLineCount) textH += C.factGapBefore + factLineCount * C.factLineH
  if (captionLines.length) textH += C.captionGapBefore + captionLines.length * C.captionLineH

  const bodyH = Math.max(qrSize, textH)
  const W = C.pad + qrSize + C.qrTextGap + textW + C.pad
  const H = C.pad + bodyH + C.pad

  return { W, H, titleLines, speciesLines, factLines, captionLines, textW, textH, bodyH }
}

function drawCenteredLines(ctx, cx, y, lines, lineH, font, color) {
  ctx.font = font
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  let cy = y
  for (const ln of lines) {
    ctx.fillText(ln, cx, cy)
    cy += lineH
  }
  return cy
}

function drawLeftLines(ctx, x, y, lines, lineH, font, color) {
  ctx.font = font
  ctx.fillStyle = color
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  let cy = y
  for (const ln of lines) {
    ctx.fillText(ln, x, cy)
    cy += lineH
  }
  return cy
}

async function drawSimpleVerticalLabel(ctx, W, H, { composed, qrSize, nameLines, speciesLines, captionLines }) {
  const S = SIMPLE
  const qrX = (W - qrSize) / 2
  const qrY = S.qrTop

  const qrImg = await loadImageElement(composed)
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)

  const hasText = nameLines.length || speciesLines.length || (captionLines && captionLines.length)
  let y = qrY + qrSize + (hasText ? S.gapAfterQr : 0)
  const cx = W / 2

  if (nameLines.length) {
    y = drawCenteredLines(
      ctx,
      cx,
      y,
      nameLines,
      S.titleLineH,
      `bold ${S.titleSize}px sans-serif`,
      '#111',
    )
    y += 4
  }
  if (speciesLines.length) {
    y = drawCenteredLines(
      ctx,
      cx,
      y,
      speciesLines,
      S.speciesLineH,
      `italic ${S.speciesSize}px sans-serif`,
      '#444',
    )
  }
  if (captionLines && captionLines.length) {
    y += S.captionGapBefore
    drawCenteredLines(ctx, cx, y, captionLines, S.captionLineH, `${S.captionSize}px sans-serif`, '#555')
  }
}

async function drawCareHorizontalLabel(ctx, W, H, {
  composed,
  qrSize,
  titleLines,
  speciesLines,
  factLines,
  captionLines,
  textW,
  textH,
}) {
  const C = CARE
  const textX = C.pad + qrSize + C.qrTextGap
  const qrY = C.pad
  const bodyH = Math.max(qrSize, textH)
  const textYOffset = textH < qrSize ? Math.floor((bodyH - textH) / 2) : 0

  const qrImg = await loadImageElement(composed)
  ctx.drawImage(qrImg, C.pad, qrY, qrSize, qrSize)

  let y = qrY + textYOffset
  if (titleLines.length) {
    y = drawLeftLines(ctx, textX, y, titleLines, C.titleLineH, `bold ${C.titleSize}px sans-serif`, '#111')
    y += 3
  }
  if (speciesLines.length) {
    y = drawLeftLines(
      ctx,
      textX,
      y,
      speciesLines,
      C.speciesLineH,
      `italic ${C.speciesSize}px sans-serif`,
      '#444',
    )
  }
  ctx.font = `${C.factSize}px sans-serif`
  for (const fact of factLines) {
    const sub = wrapLinesToWidth(ctx, fact, textW)
    if (sub.length) {
      if (y === qrY + textYOffset && (titleLines.length || speciesLines.length)) y += C.factGapBefore
      y = drawLeftLines(ctx, textX, y, sub, C.factLineH, `${C.factSize}px sans-serif`, '#222')
    }
  }
  if (captionLines && captionLines.length) {
    y += C.captionGapBefore
    drawLeftLines(ctx, textX, y, captionLines, C.captionLineH, `${C.captionSize}px sans-serif`, '#555')
  }
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

async function drawPartnerLogoCorner(ctx, canvasW, canvasH, partnerLogoSrc) {
  const src =
    partnerLogoSrc && partnerLogoSrc !== BRAND_LOGO_FOR_LIGHT_BG ? String(partnerLogoSrc).trim() : ''
  if (!src) return
  const pad = 6
  const maxW = 44
  const maxH = Math.max(28, Math.round(canvasH * 0.2))
  try {
    const logo = await loadImageElement(imgUrl(src) || src)
    const scale = Math.min(maxW / logo.width, maxH / logo.height)
    const w = Math.max(1, Math.round(logo.width * scale))
    const h = Math.max(1, Math.round(logo.height * scale))
    const x = canvasW - pad - w
    const y = pad
    const bgPad = 3
    ctx.save()
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(x - bgPad, y - bgPad, w + bgPad * 2, h + bgPad * 2, 4)
    ctx.fill()
    ctx.stroke()
    ctx.drawImage(logo, x, y, w, h)
    ctx.restore()
  } catch {
    /* partner logo is optional decoration */
  }
}

/** Tier typography + density for vendor-passport labels. */
function vendorPassportProfile(tier) {
  switch (tier) {
    case 'vial':
      return {
        pad: 5,
        commonSize: 10,
        commonLineH: 12,
        sciSize: 8,
        sciLineH: 10,
        vendorSize: 8,
        vendorLineH: 10,
        badgeSize: 7,
        factSize: 7,
        factLineH: 9,
        captionSize: 7,
        captionLineH: 9,
        idSize: 7,
        poweredSize: 6,
        logoMax: 22,
        maxCommonLines: 1,
        maxSciLines: 1,
        maxFacts: 2,
        maxFactChars: 42,
        qrScale: 0.34,
        stackQr: true,
      }
    case 'small':
      return {
        pad: 7,
        commonSize: 12,
        commonLineH: 14,
        sciSize: 9,
        sciLineH: 11,
        vendorSize: 9,
        vendorLineH: 11,
        badgeSize: 7,
        factSize: 8,
        factLineH: 10,
        captionSize: 8,
        captionLineH: 10,
        idSize: 8,
        poweredSize: 6,
        logoMax: 30,
        maxCommonLines: 2,
        maxSciLines: 1,
        maxFacts: 4,
        maxFactChars: 52,
        qrScale: 0.38,
        stackQr: false,
      }
    case 'large':
      return {
        pad: 10,
        commonSize: 16,
        commonLineH: 19,
        sciSize: 12,
        sciLineH: 15,
        vendorSize: 11,
        vendorLineH: 13,
        badgeSize: 8,
        factSize: 10,
        factLineH: 12,
        captionSize: 9,
        captionLineH: 11,
        idSize: 9,
        poweredSize: 7,
        logoMax: 44,
        maxCommonLines: 2,
        maxSciLines: 2,
        maxFacts: 8,
        maxFactChars: 64,
        qrScale: 0.42,
        stackQr: false,
      }
    default:
      return {
        pad: 8,
        commonSize: 14,
        commonLineH: 17,
        sciSize: 10,
        sciLineH: 12,
        vendorSize: 10,
        vendorLineH: 12,
        badgeSize: 7,
        factSize: 9,
        factLineH: 11,
        captionSize: 8,
        captionLineH: 10,
        idSize: 8,
        poweredSize: 6,
        logoMax: 36,
        maxCommonLines: 2,
        maxSciLines: 1,
        maxFacts: 6,
        maxFactChars: 56,
        qrScale: 0.4,
        stackQr: false,
      }
  }
}

/** Prioritize and truncate care facts to avoid overcrowding. */
export function truncateFactLines(factLines, { maxLines = 6, maxCharsPerLine = 56 } = {}) {
  if (!Array.isArray(factLines) || !factLines.length) return []
  const out = []
  for (const raw of factLines) {
    const line = String(raw ?? '').trim()
    if (!line) continue
    const clipped =
      line.length > maxCharsPerLine ? `${line.slice(0, Math.max(1, maxCharsPerLine - 1))}…` : line
    out.push(clipped)
    if (out.length >= maxLines) break
  }
  return out
}

function ellipsizeToWidth(ctx, text, maxWidth) {
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

function measureVendorOriginBlock(ctx, profile, vendorName, textW, hasLogo) {
  const logoW = hasLogo ? profile.logoMax + 6 : 0
  const textColW = Math.max(40, textW - logoW)
  ctx.font = `600 ${profile.vendorSize}px sans-serif`
  const vendorLine = ellipsizeToWidth(ctx, vendorName || '', textColW)
  const badgeH = profile.badgeSize + 4
  const textH = vendorLine ? profile.vendorLineH : 0
  const blockH = Math.max(hasLogo ? profile.logoMax : 0, textH + badgeH) + 8
  return { blockH, vendorLine, logoW, textColW, badgeH }
}

function measureVendorPassportLayout(
  ctx,
  {
    nameLine,
    speciesLine,
    factLines,
    captionLine,
    shortIdLine,
    vendorName,
    partnerLogoSrc,
    physicalSizeId,
    canvasW,
    canvasH,
  },
) {
  const preset = resolveVendorLabelSizePreset(physicalSizeId)
  const profile = vendorPassportProfile(preset.tier)
  const innerW = canvasW - profile.pad * 2
  const hasLogo = Boolean(partnerLogoSrc && String(partnerLogoSrc).trim())

  ctx.font = `bold ${profile.commonSize}px sans-serif`
  const commonLines = wrapLinesToWidth(ctx, nameLine, innerW).slice(0, profile.maxCommonLines)
  ctx.font = `italic ${profile.sciSize}px sans-serif`
  const sciLines = wrapLinesToWidth(ctx, speciesLine, innerW).slice(0, profile.maxSciLines)

  const origin = measureVendorOriginBlock(ctx, profile, vendorName, innerW, hasLogo)
  const facts = truncateFactLines(factLines, {
    maxLines: profile.maxFacts,
    maxCharsPerLine: profile.maxFactChars,
  })

  let headerH = 0
  if (commonLines.length) headerH += commonLines.length * profile.commonLineH + 2
  if (sciLines.length) headerH += sciLines.length * profile.sciLineH
  const factsH = facts.length ? 4 + facts.length * profile.factLineH : 0

  const qrSize = Math.min(
    Math.round(Math.min(canvasW, canvasH) * profile.qrScale),
    profile.stackQr ? Math.round(innerW * 0.55) : Math.round(canvasH * 0.45),
  )

  ctx.font = `${profile.captionSize}px sans-serif`
  const captionLines = captionLine
    ? wrapLinesToWidth(ctx, captionLine, innerW).slice(0, profile.stackQr ? 1 : 2)
    : []
  const captionH = captionLines.length ? 3 + captionLines.length * profile.captionLineH : 0
  const idH = shortIdLine ? profile.idSize + 4 : 0
  const poweredH = profile.poweredSize + 4

  let bodyH
  if (profile.stackQr) {
    bodyH = qrSize + (idH ? idH + 2 : 0)
  } else {
    const textStackH = factsH + captionH + idH + poweredH
    bodyH = Math.max(qrSize, textStackH)
  }

  const totalH =
    profile.pad +
    headerH +
    (origin.blockH > 0 ? origin.blockH + 4 : 0) +
    bodyH +
    (profile.stackQr ? captionH + poweredH + 2 : poweredH + 2) +
    profile.pad

  void totalH

  return {
    W: canvasW,
    H: canvasH,
    profile,
    commonLines,
    sciLines,
    facts,
    captionLines,
    qrSize,
    origin,
    hasLogo,
    innerW,
  }
}

async function drawVerifiedOriginBlock(ctx, x, y, w, profile, { partnerLogoSrc, vendorLine, verifiedOrigin, hasLogo }) {
  const blockPad = 4
  const innerH = Math.max(hasLogo ? profile.logoMax : 0, profile.vendorLineH + profile.badgeSize + 6) + blockPad * 2
  ctx.save()
  ctx.fillStyle = '#f6f4ef'
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(x, y, w, innerH, 4)
  ctx.fill()
  ctx.stroke()

  let textX = x + blockPad
  const centerY = y + innerH / 2

  if (hasLogo) {
    try {
      const src = imgUrl(partnerLogoSrc) || partnerLogoSrc
      const logo = await loadImageElement(src)
      const scale = Math.min(profile.logoMax / logo.width, profile.logoMax / logo.height)
      const lw = Math.max(1, Math.round(logo.width * scale))
      const lh = Math.max(1, Math.round(logo.height * scale))
      const lx = x + blockPad
      const ly = centerY - lh / 2
      ctx.drawImage(logo, lx, ly, lw, lh)
      textX = lx + lw + 6
    } catch {
      /* optional logo */
    }
  }

  let ty = y + blockPad + 1
  if (vendorLine) {
    ctx.font = `600 ${profile.vendorSize}px sans-serif`
    ctx.fillStyle = '#1a1a1a'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(vendorLine, textX, ty)
    ty += profile.vendorLineH
  }

  if (verifiedOrigin) {
    ctx.font = `600 ${profile.badgeSize}px sans-serif`
    ctx.fillStyle = '#1b6b3a'
    ctx.fillText(`✓ ${VERIFIED_ORIGIN_LABEL}`, textX, ty)
  }

  ctx.restore()
  return innerH
}

async function drawVendorPassportLabel(ctx, measure, { composed, qrSize, shortIdLine, captionLines, verifiedOrigin, partnerLogoSrc }) {
  const { profile, commonLines, sciLines, facts, origin, hasLogo, innerW, W } = measure
  const x0 = profile.pad
  let y = profile.pad

  if (commonLines.length) {
    y = drawLeftLines(
      ctx,
      x0,
      y,
      commonLines,
      profile.commonLineH,
      `bold ${profile.commonSize}px sans-serif`,
      '#111',
    )
    y += 2
  }
  if (sciLines.length) {
    y = drawLeftLines(
      ctx,
      x0,
      y,
      sciLines,
      profile.sciLineH,
      `italic ${profile.sciSize}px sans-serif`,
      '#444',
    )
  }

  if (vendorLineOrBadge(measure, verifiedOrigin)) {
    y += 3
    const blockH = await drawVerifiedOriginBlock(ctx, x0, y, innerW, profile, {
      partnerLogoSrc,
      vendorLine: origin.vendorLine,
      verifiedOrigin,
      hasLogo,
    })
    y += blockH + 4
  }

  const qrImg = await loadImageElement(composed)

  if (profile.stackQr) {
    const qrX = (W - qrSize) / 2
    ctx.drawImage(qrImg, qrX, y, qrSize, qrSize)
    y += qrSize + 2
    if (shortIdLine) {
      ctx.font = `600 ${profile.idSize}px sans-serif`
      ctx.fillStyle = '#333'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(String(shortIdLine), W / 2, y)
      y += profile.idSize + 4
    }
    if (facts.length) {
      y += 2
      y = drawLeftLines(ctx, x0, y, facts, profile.factLineH, `${profile.factSize}px sans-serif`, '#222')
    }
    if (captionLines.length) {
      y += 3
      drawLeftLines(ctx, x0, y, captionLines, profile.captionLineH, `${profile.captionSize}px sans-serif`, '#555')
      y += captionLines.length * profile.captionLineH
    }
  } else {
    const qrX = x0
    const qrY = y
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)
    const textX = qrX + qrSize + 8
    const textW = innerW - qrSize - 8
    let ty = qrY

    if (facts.length) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(textX, ty, textW, measure.H)
      ctx.clip()
      for (const fact of facts) {
        const sub = wrapLinesToWidth(ctx, fact, textW)
        ty = drawLeftLines(ctx, textX, ty, sub, profile.factLineH, `${profile.factSize}px sans-serif`, '#222')
      }
      ctx.restore()
    }

    let metaY = Math.max(ty, qrY + qrSize - (shortIdLine ? profile.idSize + 8 : 0))
    if (shortIdLine) {
      ctx.font = `600 ${profile.idSize}px sans-serif`
      ctx.fillStyle = '#333'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(String(shortIdLine), textX, metaY)
      metaY += profile.idSize + 4
    }
    if (captionLines.length) {
      drawLeftLines(
        ctx,
        textX,
        metaY,
        captionLines,
        profile.captionLineH,
        `${profile.captionSize}px sans-serif`,
        '#555',
      )
    }
    y = Math.max(qrY + qrSize, metaY + captionLines.length * profile.captionLineH)
  }

  y += 4
  ctx.font = `${profile.poweredSize}px sans-serif`
  ctx.fillStyle = '#888'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.fillText(TA_POWERED_BY, W - profile.pad, y)
}

function vendorLineOrBadge(measure, verifiedOrigin) {
  return Boolean(measure.origin.vendorLine || verifiedOrigin || measure.hasLogo)
}

/** Width reserved in the care-facts text column so the corner logo does not overlap copy. */
export function partnerLogoTextReserve(partnerLogoSrc) {
  const src =
    partnerLogoSrc && partnerLogoSrc !== BRAND_LOGO_FOR_LIGHT_BG ? String(partnerLogoSrc).trim() : ''
  return src ? 52 : 0
}

/**
 * PNG de etiqueta: simple, care facts, or co-branded vendor-passport.
 * TarantulApp logo sits in the QR center; vendor logo lives in the Verified Origin block.
 */
export async function buildFullLabelPngDataUrl({
  url,
  nameLine,
  speciesLine,
  factLines = null,
  captionLine = null,
  normalizeHeight = null,
  brandLogoSrc = null,
  partnerLogoSrc = null,
  shortIdLine = null,
  worldBadgeInfo: _worldBadgeInfo,
  layoutMode = null,
  physicalSizeId = DEFAULT_VENDOR_LABEL_SIZE_ID,
  vendorName = null,
  verifiedOrigin = false,
}) {
  const partnerLogo = partnerLogoSrc ?? brandLogoSrc
  const hasFacts = Array.isArray(factLines) && factLines.length > 0
  const effectiveLayout =
    layoutMode === LABEL_LAYOUT_MODES.VENDOR_PASSPORT
      ? LABEL_LAYOUT_MODES.VENDOR_PASSPORT
      : layoutMode === LABEL_LAYOUT_MODES.CARE
        ? LABEL_LAYOUT_MODES.CARE
        : layoutMode === LABEL_LAYOUT_MODES.SIMPLE
          ? LABEL_LAYOUT_MODES.SIMPLE
          : hasFacts
            ? LABEL_LAYOUT_MODES.CARE
            : LABEL_LAYOUT_MODES.SIMPLE

  const measureCanvas = document.createElement('canvas')
  const mctx = measureCanvas.getContext('2d')

  let W
  let H
  let drawPayload
  let qrSize

  if (effectiveLayout === LABEL_LAYOUT_MODES.VENDOR_PASSPORT) {
    const preset = resolveVendorLabelSizePreset(physicalSizeId)
    const { widthPx, heightPx } = vendorLabelCanvasPx(preset)
    const vendorMeasure = measureVendorPassportLayout(mctx, {
      nameLine,
      speciesLine,
      factLines,
      captionLine,
      shortIdLine,
      vendorName,
      partnerLogoSrc: partnerLogo,
      physicalSizeId,
      canvasW: widthPx,
      canvasH: heightPx,
    })
    qrSize = vendorMeasure.qrSize
    W = vendorMeasure.W
    H = vendorMeasure.H
    drawPayload = { mode: 'vendor-passport', measure: vendorMeasure, verifiedOrigin }
  } else {
    qrSize =
      effectiveLayout === LABEL_LAYOUT_MODES.CARE ? CARE_LABEL_QR_PX : SIMPLE_LABEL_QR_PX

    if (effectiveLayout === LABEL_LAYOUT_MODES.SIMPLE) {
      const m = measureSimpleVertical(mctx, { nameLine, speciesLine, captionLine, qrSize })
      W = m.W
      H = m.H
      drawPayload = {
        mode: 'simple',
        nameLines: m.nameLines,
        speciesLines: m.speciesLines,
        captionLines: m.captionLines,
      }
    } else {
      const logoReserve = partnerLogoTextReserve(partnerLogo)
      const m = measureCareHorizontal(mctx, {
        nameLine,
        speciesLine,
        factLines,
        captionLine,
        qrSize,
        partnerLogoReserve: logoReserve,
      })
      W = m.W
      H = m.H
      drawPayload = {
        mode: 'care',
        titleLines: m.titleLines,
        speciesLines: m.speciesLines,
        factLines: m.factLines,
        captionLines: m.captionLines,
        textW: m.textW,
        textH: m.textH,
      }
    }
  }

  const raw = await QRCode.toDataURL(url, {
    width: qrSize,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#FFFFFF' },
  })
  const composed = await compositeQrPngDataUrl(raw, qrSize, QR_CENTER_LOGO_FRACTION, BRAND_LOGO_FOR_LIGHT_BG)

  const targetH = normalizeHeight != null ? Math.max(H, normalizeHeight) : H
  const layoutDims = {
    canvasW: W,
    canvasH: targetH,
    qrSize,
    layoutMode: effectiveLayout,
    physicalSizeId: effectiveLayout === LABEL_LAYOUT_MODES.VENDOR_PASSPORT ? physicalSizeId : null,
  }

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, targetH)

  const renderLabel = async (targetCtx) => {
    if (drawPayload.mode === 'vendor-passport') {
      await drawVendorPassportLabel(targetCtx, drawPayload.measure, {
        composed,
        qrSize,
        shortIdLine,
        captionLines: drawPayload.measure.captionLines,
        verifiedOrigin: drawPayload.verifiedOrigin,
        partnerLogoSrc: partnerLogo,
      })
    } else if (drawPayload.mode === 'simple') {
      await drawSimpleVerticalLabel(targetCtx, W, H, {
        composed,
        qrSize,
        nameLines: drawPayload.nameLines,
        speciesLines: drawPayload.speciesLines,
        captionLines: drawPayload.captionLines,
      })
    } else {
      await drawCareHorizontalLabel(targetCtx, W, H, {
        composed,
        qrSize,
        titleLines: drawPayload.titleLines,
        speciesLines: drawPayload.speciesLines,
        factLines: drawPayload.factLines,
        captionLines: drawPayload.captionLines,
        textW: drawPayload.textW,
        textH: drawPayload.textH,
      })
    }
  }

  const padTop = normalizeHeight != null && targetH > H ? Math.floor((targetH - H) / 2) : 0
  if (padTop > 0) {
    ctx.save()
    ctx.translate(0, padTop)
    await renderLabel(ctx)
    ctx.restore()
  } else {
    await renderLabel(ctx)
  }

  if (effectiveLayout !== LABEL_LAYOUT_MODES.VENDOR_PASSPORT) {
    await drawPartnerLogoCorner(ctx, W, targetH, partnerLogo)
  }

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
  captionLine = null,
  filenameBase,
  brandLogoSrc = null,
  partnerLogoSrc = null,
  shortIdLine,
  worldBadgeInfo,
  layoutMode = null,
  physicalSizeId,
  vendorName = null,
  verifiedOrigin = false,
}) {
  const { dataUrl } = await buildFullLabelPngDataUrl({
    url,
    nameLine,
    speciesLine,
    factLines,
    captionLine,
    brandLogoSrc,
    partnerLogoSrc,
    shortIdLine,
    worldBadgeInfo,
    layoutMode,
    physicalSizeId,
    vendorName,
    verifiedOrigin,
  })
  const safeName = sanitizeFilename(filenameBase || 'qr')
  await shareOrDownloadDataUrl(dataUrl, `${safeName}-QR.png`, {
    mimeType: 'image/png',
    title: `${safeName} QR`,
    dialogTitle: `${safeName} QR`,
  })
}
