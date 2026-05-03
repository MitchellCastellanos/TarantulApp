import { BRAND_WITH_TM } from '../constants/brand'
import { BRAND_LOGO_FOR_LIGHT_BG, buildFullLabelPngDataUrl, labelDocxDimensions } from './qrBrandComposite'
import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  SectionType,
  TextRun,
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

async function buildLabelParagraphs(items, displayQrPx) {
  const out = []
  for (const item of items) {
    const dataUrl = await buildFullLabelPngDataUrl({
      url: item.url,
      nameLine: item.titleLine1,
      speciesLine: item.titleLine2 || '',
      shortIdLine: item.subtitle || '',
    })
    const buf = dataUrlToUint8Array(dataUrl)
    const { width, height } = labelDocxDimensions(displayQrPx)
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 72 },
        children: [
          new ImageRun({
            type: 'png',
            data: buf,
            transformation: { width, height },
            altText: { name: 'Etiqueta QR', description: item.titleLine1, title: item.titleLine1 },
          }),
        ],
      }),
    )
  }
  return out
}

/**
 * @param {object} opts
 * @param {{ url: string, titleLine1: string, titleLine2?: string, subtitle?: string }[]} opts.items
 * @param {'fixed'|'flex'} opts.layout — columnas de Word (2 o 4), sin tabla para que mover una etiqueta no arrastre celdas vacías
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

  const labelParagraphs = await buildLabelParagraphs(items, displayQrPx)
  const columnCount = layout === 'flex' ? 4 : 2
  const columnOpts = {
    count: columnCount,
    space: 280,
  }

  const sections =
    intro.length > 0
      ? [
          { children: intro },
          {
            properties: {
              type: SectionType.CONTINUOUS,
              column: columnOpts,
            },
            children: labelParagraphs,
          },
        ]
      : [
          {
            properties: {
              column: columnOpts,
            },
            children: labelParagraphs,
          },
        ]

  return Packer.toBlob(
    new Document({
      creator: BRAND_WITH_TM,
      title: docTitle || `${BRAND_WITH_TM} QR`,
      sections,
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
