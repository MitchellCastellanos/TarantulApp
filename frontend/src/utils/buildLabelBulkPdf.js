import { jsPDF } from 'jspdf'
import { buildFullLabelPngDataUrl, LABEL_LAYOUT_MODES } from './qrBrandComposite'
import { cmToPdfPt, resolveLabelExportPreset } from './labelSizes'
import { shareOrDownloadBlob } from './shareOrDownloadBlob'

/** Máximo de etiquetas por PDF (rendimiento del navegador). */
export const LABEL_BULK_MAX = 60

const PAGE_W_PT = 612
const PAGE_H_PT = 792
const MARGIN_PT = 18
const ROW_GAP_PT = 8
const COL_GAP_PT = 10

async function renderLabelDataUrl(item, normalizeHeight, opts) {
  const {
    partnerLogoSrc,
    captionLine,
    layoutMode,
    physicalSizeId,
    verifiedOrigin,
  } = opts
  return buildFullLabelPngDataUrl({
    url: item.url,
    nameLine: item.titleLine1,
    speciesLine: item.titleLine2 || '',
    factLines: item.factLines ?? null,
    captionLine: captionLine ?? null,
    normalizeHeight,
    partnerLogoSrc,
    shortIdLine: item.shortIdLine ?? null,
    layoutMode,
    physicalSizeId,
    vendorName: item.vendorName ?? null,
    verifiedOrigin: item.verifiedOrigin ?? verifiedOrigin ?? false,
  })
}

function labelDisplayPtLegacy(rendered, targetQrPt) {
  const qrSize = rendered.layoutDims?.qrSize || rendered.height * 0.55
  const heightPt = targetQrPt / Math.max(0.2, qrSize / rendered.height)
  const ratio = rendered.width / rendered.height
  return { widthPt: heightPt * ratio, heightPt }
}

function labelDisplayPtVendor(rendered, preset) {
  const targetWidthPt = cmToPdfPt(preset.widthCm)
  const scale = targetWidthPt / Math.max(1, rendered.width)
  return {
    widthPt: targetWidthPt,
    heightPt: rendered.height * scale,
  }
}

/**
 * @param {object} opts
 * @param {{ url: string, titleLine1: string, titleLine2?: string, factLines?: string[]|null, shortIdLine?: string|null, vendorName?: string|null, verifiedOrigin?: boolean }[]} opts.items
 * @param {string} [opts.sizeId] — legacy tiny|small|medium|large or vendor vial|small|medium|large
 * @param {'simple'|'care'|'vendor-passport'|null} [opts.layoutMode]
 * @param {string} [opts.docTitle]
 * @param {string} [opts.filename]
 */
export async function buildLabelBulkPdfBlob({
  items,
  sizeId = 'medium',
  layoutMode = null,
  docTitle,
  filename,
  brandLogoSrc,
  partnerLogoSrc,
  captionLine,
  verifiedOrigin = false,
}) {
  const effectiveLayout =
    layoutMode === LABEL_LAYOUT_MODES.VENDOR_PASSPORT
      ? LABEL_LAYOUT_MODES.VENDOR_PASSPORT
      : layoutMode
  const preset = resolveLabelExportPreset(sizeId, effectiveLayout)
  const columns = preset.columns
  const logo = partnerLogoSrc ?? brandLogoSrc
  const renderOpts = {
    partnerLogoSrc: logo,
    captionLine,
    layoutMode: effectiveLayout,
    physicalSizeId: sizeId,
    verifiedOrigin,
  }

  const rendered = []
  for (const item of items) {
    rendered.push(await renderLabelDataUrl(item, null, renderOpts))
  }

  const normalizeHeight = rendered.length
    ? Math.max(...rendered.map((r) => r.height))
    : null
  if (normalizeHeight) {
    for (let i = 0; i < items.length; i++) {
      if (rendered[i].height < normalizeHeight) {
        rendered[i] = await renderLabelDataUrl(items[i], normalizeHeight, renderOpts)
      }
    }
  }

  const contentW = PAGE_W_PT - MARGIN_PT * 2
  const colW = (contentW - (columns - 1) * COL_GAP_PT) / columns
  const isVendor = preset.mode === 'vendor-passport'
  const targetQrPt = !isVendor && preset.cm ? cmToPdfPt(preset.cm) : null

  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true })
  if (docTitle) {
    doc.setFontSize(11)
    doc.setTextColor(80, 80, 80)
    doc.text(docTitle, MARGIN_PT, MARGIN_PT + 4)
  }

  let x = MARGIN_PT
  let y = docTitle ? MARGIN_PT + 18 : MARGIN_PT
  let rowMaxH = 0
  let col = 0

  for (let i = 0; i < rendered.length; i++) {
    const { dataUrl } = rendered[i]
    const dims = isVendor
      ? labelDisplayPtVendor(rendered[i], preset)
      : labelDisplayPtLegacy(rendered[i], targetQrPt)
    let drawW = dims.widthPt
    let drawH = dims.heightPt
    if (drawW > colW) {
      const scale = colW / drawW
      drawW = colW
      drawH = drawH * scale
    }

    if (y + drawH > PAGE_H_PT - MARGIN_PT) {
      doc.addPage()
      x = MARGIN_PT
      y = MARGIN_PT
      col = 0
      rowMaxH = 0
    }

    doc.addImage(dataUrl, 'PNG', x + (colW - drawW) / 2, y, drawW, drawH)
    rowMaxH = Math.max(rowMaxH, drawH)
    col += 1

    if (col >= columns) {
      col = 0
      x = MARGIN_PT
      y += rowMaxH + ROW_GAP_PT
      rowMaxH = 0
    } else {
      x += colW + COL_GAP_PT
    }
  }

  const blob = doc.output('blob')
  const suffix = isVendor ? `vendor-${preset.id}` : preset.id
  return { blob, filename: filename || `tarantulapp-labels-${suffix}.pdf` }
}

export async function triggerLabelPdfDownload(opts) {
  const { blob, filename } = await buildLabelBulkPdfBlob(opts)
  await shareOrDownloadBlob({
    blob,
    filename,
    mimeType: 'application/pdf',
    title: filename,
    dialogTitle: filename,
  })
}
