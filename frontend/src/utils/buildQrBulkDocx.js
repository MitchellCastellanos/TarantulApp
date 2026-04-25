import QRCode from 'qrcode'
import { BRAND_WITH_TM } from '../constants/brand'
import { compositeQrPngDataUrl, BRAND_LOGO_FOR_LIGHT_BG } from './qrBrandComposite'
import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlignTable,
  WidthType,
} from 'docx'

/** Máximo de QRs por archivo (rendimiento del navegador). */
export const QR_BULK_MAX = 60

/** Píxeles lógicos (96 dpi) que docx usa en ImageRun.transformation — equivale visualmente a ~cm al imprimir. */
export function cmToDocxDisplayPx(cm) {
  return Math.max(48, Math.round((cm * 96) / 2.54))
}

function dataUrlToUint8Array(dataUrl) {
  const comma = dataUrl.indexOf(',')
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  const binary = atob(base64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function pngBufferForQr(text, rasterSize) {
  const dataUrl = await QRCode.toDataURL(text, {
    width: rasterSize,
    // Keep a tiny quiet zone so scanners remain reliable.
    margin: 0,
    errorCorrectionLevel: 'H',
    color: { dark: '#000000', light: '#FFFFFF' },
  })
  const composed = await compositeQrPngDataUrl(dataUrl, rasterSize)
  return dataUrlToUint8Array(composed)
}

async function tryBrandLogoBytes() {
  try {
    const r = await fetch(BRAND_LOGO_FOR_LIGHT_BG)
    if (!r.ok) return null
    return new Uint8Array(await r.arrayBuffer())
  } catch {
    return null
  }
}

function labelParagraphs(titleLine1, titleLine2, subtitle) {
  const lines = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: titleLine1, bold: true })],
    }),
  ]
  if (titleLine2) {
    lines.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: subtitle ? 40 : 0 },
        children: [new TextRun({ text: titleLine2, italics: true, size: 18 })],
      }),
    )
  }
  if (subtitle) {
    lines.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [new TextRun({ text: subtitle, size: 16, color: '666666' })],
      }),
    )
  }
  return lines
}

async function qrCell({ url, titleLine1, titleLine2, subtitle, displayPx }) {
  const raster = Math.min(900, Math.round(displayPx * 2.5))
  const buf = await pngBufferForQr(url, raster)
  const image = new ImageRun({
    type: 'png',
    data: buf,
    transformation: { width: displayPx, height: displayPx },
    altText: { name: 'QR', description: titleLine1, title: titleLine1 },
  })
  const children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [image],
    }),
    ...labelParagraphs(titleLine1, titleLine2, subtitle),
  ]
  return new TableCell({
    children,
    verticalAlign: VerticalAlignTable.CENTER,
    margins: { top: 60, bottom: 60, left: 50, right: 50 },
    width: { size: 50, type: WidthType.PERCENTAGE },
  })
}

async function qrCellFullWidth({ url, titleLine1, titleLine2, subtitle, displayPx }) {
  const raster = Math.min(900, Math.round(displayPx * 2.5))
  const buf = await pngBufferForQr(url, raster)
  const image = new ImageRun({
    type: 'png',
    data: buf,
    transformation: { width: displayPx, height: displayPx },
    altText: { name: 'QR', description: titleLine1, title: titleLine1 },
  })
  const children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [image],
    }),
    ...labelParagraphs(titleLine1, titleLine2, subtitle),
  ]
  return new TableCell({
    children,
    verticalAlign: VerticalAlignTable.CENTER,
    margins: { top: 80, bottom: 80, left: 70, right: 70 },
    columnSpan: 2,
    width: { size: 100, type: WidthType.PERCENTAGE },
  })
}

async function qrCellCompact({ url, displayPx }) {
  const raster = Math.min(900, Math.round(displayPx * 2.5))
  const buf = await pngBufferForQr(url, raster)
  return new TableCell({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [
          new ImageRun({
            type: 'png',
            data: buf,
            transformation: { width: displayPx, height: displayPx },
            altText: { name: 'QR', description: 'QR', title: 'QR' },
          }),
        ],
      }),
    ],
    verticalAlign: VerticalAlignTable.CENTER,
    margins: { top: 30, bottom: 30, left: 30, right: 30 },
    width: { size: 25, type: WidthType.PERCENTAGE },
  })
}

function emptyCompactCell() {
  return new TableCell({
    children: [new Paragraph({ text: '' })],
    margins: { top: 30, bottom: 30, left: 30, right: 30 },
    width: { size: 25, type: WidthType.PERCENTAGE },
  })
}

/**
 * @param {object} opts
 * @param {{ url: string, titleLine1: string, titleLine2?: string, subtitle?: string }[]} opts.items
 * @param {'fixed'|'flex'} opts.layout — rejilla 2 columnas con tamaño uniforme, o una columna con QRs más pequeños para retocar en Word
 * @param {number} [opts.sizeCm] — lado del QR en modo fijo (cm)
 * @param {string} [opts.docTitle]
 * @param {string} [opts.footerNote]
 */
export async function buildQrBulkDocxBlob({ items, layout, sizeCm = 5, docTitle, footerNote }) {
  const displayPxFixed = cmToDocxDisplayPx(sizeCm)
  const displayPxFlex = cmToDocxDisplayPx(2.6)

  const intro = []
  const logoBytes = await tryBrandLogoBytes()
  if (logoBytes?.length) {
    intro.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [
          new ImageRun({
            type: 'png',
            data: logoBytes,
            transformation: { width: 48, height: 48 },
            altText: { name: BRAND_WITH_TM, description: BRAND_WITH_TM, title: BRAND_WITH_TM },
          }),
        ],
      }),
    )
  }
  if (docTitle) {
    intro.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 60 },
        children: [new TextRun({ text: docTitle, bold: true, size: 24 })],
      }),
    )
  }
  if (footerNote) {
    intro.push(
      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({ text: footerNote, italics: true, size: 18, color: '555555' })],
      }),
    )
  }

  const rows = []

  if (layout === 'flex') {
    const COLUMNS = 4
    for (let i = 0; i < items.length; i += COLUMNS) {
      const chunk = items.slice(i, i + COLUMNS)
      const cells = []
      for (const item of chunk) {
        cells.push(await qrCellCompact({ url: item.url, displayPx: displayPxFlex }))
      }
      while (cells.length < COLUMNS) cells.push(emptyCompactCell())
      rows.push(new TableRow({ children: cells }))
    }
    const table = new Table({
      layout: TableLayoutType.FIXED,
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows,
    })
    return Packer.toBlob(
      new Document({
        creator: BRAND_WITH_TM,
        title: docTitle || `${BRAND_WITH_TM} QR`,
        sections: [{ children: [...intro, table] }],
      }),
    )
  }

  for (let i = 0; i < items.length; i += 2) {
    const left = items[i]
    const right = items[i + 1]
    const leftCell = await qrCell({ ...left, displayPx: displayPxFixed })
    if (right) {
      const rightCell = await qrCell({ ...right, displayPx: displayPxFixed })
      rows.push(new TableRow({ children: [leftCell, rightCell] }))
    } else {
      const wide = await qrCellFullWidth({ ...left, displayPx: displayPxFixed })
      rows.push(new TableRow({ children: [wide] }))
    }
  }

  const table = new Table({
    layout: TableLayoutType.FIXED,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  })

  return Packer.toBlob(
    new Document({
      creator: BRAND_WITH_TM,
      title: docTitle || `${BRAND_WITH_TM} QR`,
      sections: [{ children: [...intro, table] }],
    }),
  )
}

export function triggerDocxDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
