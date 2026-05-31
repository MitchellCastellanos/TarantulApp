import { jsPDF } from 'jspdf'
import { buildFullLabelPngDataUrl } from './qrBrandComposite'
import { cmToPdfPt, resolveLabelSizePreset } from './labelSizes'
import { shareOrDownloadBlob } from './shareOrDownloadBlob'

/** Máximo de etiquetas por PDF (rendimiento del navegador). */
export const LABEL_BULK_MAX = 60

const PAGE_W_PT = 612
const PAGE_H_PT = 792
const MARGIN_PT = 18
const ROW_GAP_PT = 8
const COL_GAP_PT = 10

async function renderLabelDataUrl(item, normalizeHeight, partnerLogoSrc, captionLine) {
  return buildFullLabelPngDataUrl({
    url: item.url,
    nameLine: item.titleLine1,
    speciesLine: item.titleLine2 || '',
    factLines: item.factLines ?? null,
    captionLine: captionLine ?? null,
    normalizeHeight,
    partnerLogoSrc,
  })
}

function labelDisplayPt(rendered, targetQrPt) {
  const qrSize = rendered.layoutDims?.qrSize || rendered.height * 0.55
  const heightPt = targetQrPt / Math.max(0.2, qrSize / rendered.height)
  const ratio = rendered.width / rendered.height
  return { widthPt: heightPt * ratio, heightPt }
}

/**
 * @param {object} opts
 * @param {{ url: string, titleLine1: string, titleLine2?: string, factLines?: string[]|null }[]} opts.items
 * @param {string} [opts.sizeId] — tiny | small | medium | large
 * @param {string} [opts.docTitle]
 * @param {string} [opts.filename]
 */
export async function buildLabelBulkPdfBlob({ items, sizeId = 'medium', docTitle, filename, brandLogoSrc, partnerLogoSrc, captionLine }) {
  const preset = resolveLabelSizePreset(sizeId)
  const columns = preset.columns
  const targetQrPt = cmToPdfPt(preset.cm)
  const logo = partnerLogoSrc ?? brandLogoSrc

  const rendered = []
  for (const item of items) {
    rendered.push(await renderLabelDataUrl(item, null, logo, captionLine))
  }

  const normalizeHeight = rendered.length
    ? Math.max(...rendered.map((r) => r.height))
    : null
  if (normalizeHeight) {
    for (let i = 0; i < items.length; i++) {
      if (rendered[i].height < normalizeHeight) {
        rendered[i] = await renderLabelDataUrl(items[i], normalizeHeight, logo, captionLine)
      }
    }
  }

  const contentW = PAGE_W_PT - MARGIN_PT * 2
  const colW = (contentW - (columns - 1) * COL_GAP_PT) / columns

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
    const dims = labelDisplayPt(rendered[i], targetQrPt)
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
  return { blob, filename: filename || `tarantulapp-labels-${preset.id}.pdf` }
}

export async function triggerLabelPdfDownload(opts) {
  // opts may include partnerLogoSrc (or legacy brandLogoSrc) — forwarded through buildLabelBulkPdfBlob.
  const { blob, filename } = await buildLabelBulkPdfBlob(opts)
  await shareOrDownloadBlob({
    blob,
    filename,
    mimeType: 'application/pdf',
    title: filename,
    dialogTitle: filename,
  })
}
