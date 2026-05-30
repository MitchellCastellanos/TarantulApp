import { BRAND_WITH_TM } from '../constants/brand'
import { BRAND_LOGO_FOR_LIGHT_BG, buildFullLabelPngDataUrl, labelDocxDimensions } from './qrBrandComposite'
import { shareOrDownloadBlob } from './shareOrDownloadBlob'
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

/** US Letter width in twips (8.5"). */
const PAGE_WIDTH_TWIPS = 12240

/** Márgenes estrechos para hojas de etiquetas (~0.3"). */
const LABEL_MARGIN_TWIPS = 432

/** Separación entre columnas en twips. */
const LABEL_COLUMN_SPACE_TWIPS = 180

/** Píxeles lógicos (96 dpi) que docx usa en ImageRun.transformation — equivale visualmente a ~cm al imprimir. */
export function cmToDocxDisplayPx(cm) {
  return Math.max(48, Math.round((cm * 96) / 2.54))
}

/** Ancho máximo de imagen por columna según página y número de columnas. */
export function docxColumnMaxWidthPx(columnCount) {
  const cols = Math.max(1, columnCount)
  const content = PAGE_WIDTH_TWIPS - LABEL_MARGIN_TWIPS * 2
  const colTwips = (content - (cols - 1) * LABEL_COLUMN_SPACE_TWIPS) / cols
  return Math.floor((colTwips * 96) / 1440)
}

export function labelDocxDimensionsFit(layoutDims, displayQrPx, maxWidthPx) {
  const natural = labelDocxDimensions(layoutDims, displayQrPx)
  if (natural.width <= maxWidthPx) return natural
  const ratio = maxWidthPx / natural.width
  return {
    width: maxWidthPx,
    height: Math.round(natural.height * ratio),
  }
}

function labelSectionPage() {
  return {
    margin: {
      top: LABEL_MARGIN_TWIPS,
      right: LABEL_MARGIN_TWIPS,
      bottom: LABEL_MARGIN_TWIPS,
      left: LABEL_MARGIN_TWIPS,
      header: 0,
      footer: 0,
      gutter: 0,
    },
  }
}

function resolveColumnCount(layout, items) {
  const hasCareLabels = items.some((item) => Array.isArray(item.factLines) && item.factLines.length > 0)
  if (layout === 'flex') return hasCareLabels ? 2 : 4
  return 2
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

async function renderLabelPng(item, normalizeHeight, brandLogoSrc, captionLine) {
  return buildFullLabelPngDataUrl({
    url: item.url,
    nameLine: item.titleLine1,
    speciesLine: item.titleLine2 || '',
    factLines: item.factLines ?? null,
    captionLine: captionLine ?? null,
    normalizeHeight,
    brandLogoSrc,
  })
}

async function buildLabelParagraphs(items, displayQrPx, layout, labelAltText, brandLogoSrc, captionLine) {
  const columnCount = resolveColumnCount(layout, items)
  const maxWidthPx = docxColumnMaxWidthPx(columnCount)

  const rendered = []
  for (const item of items) {
    rendered.push(await renderLabelPng(item, null, brandLogoSrc, captionLine))
  }

  let normalizeHeight = null
  if (layout === 'fixed' && rendered.length > 0) {
    normalizeHeight = Math.max(...rendered.map((r) => r.height))
    const needsNormalize = rendered.some((r) => r.height < normalizeHeight)
    if (needsNormalize) {
      for (let i = 0; i < items.length; i++) {
        rendered[i] = await renderLabelPng(items[i], normalizeHeight, brandLogoSrc, captionLine)
      }
    }
  }

  const out = []
  for (let i = 0; i < items.length; i++) {
    const { dataUrl, layoutDims } = rendered[i]
    const buf = dataUrlToUint8Array(dataUrl)
    const { width, height } = labelDocxDimensionsFit(layoutDims, displayQrPx, maxWidthPx)
    const item = items[i]
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 40, line: 240 },
        children: [
          new ImageRun({
            type: 'png',
            data: buf,
            transformation: { width, height },
            altText: { name: labelAltText, description: item.titleLine1, title: item.titleLine1 },
          }),
        ],
      }),
    )
  }
  return { paragraphs: out, columnCount }
}

/**
 * @param {object} opts
 * @param {{ url: string, titleLine1: string, titleLine2?: string, factLines?: string[]|null, filenameBase?: string }[]} opts.items
 * @param {'fixed'|'flex'} opts.layout — columnas de Word (2 o 4), sin tabla para que mover una etiqueta no arrastre celdas vacías
 * @param {number} [opts.sizeCm] — lado del **QR** en cm (el DOCX escala la etiqueta entera manteniendo proporción)
 * @param {string} [opts.docTitle]
 * @param {string} [opts.footerNote]
 * @param {string} [opts.labelAltText] — texto accesible de la imagen (i18n)
 */
export async function buildQrBulkDocxBlob({ items, layout, sizeCm = 5, docTitle, footerNote, labelAltText = 'QR label', brandLogoSrc, captionLine }) {
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

  const { paragraphs: labelParagraphs, columnCount } = await buildLabelParagraphs(
    items,
    displayQrPx,
    layout,
    labelAltText,
    brandLogoSrc,
    captionLine,
  )
  const columnOpts = {
    count: columnCount,
    space: LABEL_COLUMN_SPACE_TWIPS,
    equalWidth: true,
  }

  const labelSection = {
    properties: {
      type: intro.length > 0 ? SectionType.CONTINUOUS : undefined,
      page: labelSectionPage(),
      column: columnOpts,
    },
    children: labelParagraphs,
  }

  const sections =
    intro.length > 0
      ? [{ properties: { page: labelSectionPage() }, children: intro }, labelSection]
      : [labelSection]

  return Packer.toBlob(
    new Document({
      creator: BRAND_WITH_TM,
      title: docTitle || `${BRAND_WITH_TM} QR`,
      sections,
    }),
  )
}

export async function triggerDocxDownload(blob, filename) {
  await shareOrDownloadBlob({
    blob,
    filename,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    title: filename,
    dialogTitle: filename,
  })
}
