import { BRAND_WITH_TM } from '../constants/brand'
import { BRAND_LOGO_FOR_LIGHT_BG, buildFullLabelPngDataUrl, labelDocxDimensions } from './qrBrandComposite'
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

async function tryBrandLogoBytes() {
  try {
    const r = await fetch(BRAND_LOGO_FOR_LIGHT_BG)
    if (!r.ok) return null
    return new Uint8Array(await r.arrayBuffer())
  } catch {
    return null
  }
}

/**
 * Una celda = una imagen (etiqueta completa). Así Word no “corre” el pie respecto al QR en vista flexible.
 */
async function labelTableCell({
  url,
  titleLine1,
  titleLine2,
  subtitle,
  displayQrPx,
  widthPercent,
  columnSpan = 1,
}) {
  const dataUrl = await buildFullLabelPngDataUrl({
    url,
    nameLine: titleLine1,
    speciesLine: titleLine2 || '',
    shortIdLine: subtitle || '',
  })
  const buf = dataUrlToUint8Array(dataUrl)
  const { width, height } = labelDocxDimensions(displayQrPx)
  const image = new ImageRun({
    type: 'png',
    data: buf,
    transformation: { width, height },
    altText: { name: 'Etiqueta QR', description: titleLine1, title: titleLine1 },
  })
  return new TableCell({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
        children: [image],
      }),
    ],
    verticalAlign: VerticalAlignTable.CENTER,
    margins: { top: 28, bottom: 28, left: 20, right: 20 },
    columnSpan,
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
  })
}

function emptyLabelCell(widthPercent) {
  return new TableCell({
    children: [new Paragraph({ text: '' })],
    margins: { top: 28, bottom: 28, left: 20, right: 20 },
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
  })
}

/**
 * @param {object} opts
 * @param {{ url: string, titleLine1: string, titleLine2?: string, subtitle?: string }[]} opts.items
 * @param {'fixed'|'flex'} opts.layout — rejilla 2 columnas con tamaño uniforme, o cuatro columnas más pequeñas
 * @param {number} [opts.sizeCm] — lado del **QR** en cm (el DOCX escala la etiqueta entera manteniendo proporción)
 * @param {string} [opts.docTitle]
 * @param {string} [opts.footerNote]
 */
export async function buildQrBulkDocxBlob({ items, layout, sizeCm = 5, docTitle, footerNote }) {
  const displayQrPx = cmToDocxDisplayPx(sizeCm)

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
        cells.push(
          await labelTableCell({
            ...item,
            displayQrPx,
            widthPercent: 100 / COLUMNS,
          }),
        )
      }
      while (cells.length < COLUMNS) cells.push(emptyLabelCell(100 / COLUMNS))
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
    const leftCell = await labelTableCell({
      ...left,
      displayQrPx,
      widthPercent: 50,
    })
    if (right) {
      const rightCell = await labelTableCell({
        ...right,
        displayQrPx,
        widthPercent: 50,
      })
      rows.push(new TableRow({ children: [leftCell, rightCell] }))
    } else {
      const wide = await labelTableCell({
        ...left,
        displayQrPx,
        widthPercent: 100,
        columnSpan: 2,
      })
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
