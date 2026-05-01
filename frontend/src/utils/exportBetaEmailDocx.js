import { BETA_EMAIL_SIGNATURE_IMAGE_PATH } from './welcomeBetaEmail'

/**
 * Build a .docx blob: plain-text body + signature banner image when fetch succeeds.
 * @param {{ fileBaseName: string, bodyText: string }} opts
 * @returns {Promise<Blob>}
 */
export async function buildBetaEmailDocxBlob({ bodyText }) {
  const { Document, Packer, Paragraph, TextRun, ImageRun } = await import('docx')

  const lines = String(bodyText || '').split(/\r?\n/)
  const paragraphs = lines.map(
    (line) =>
      new Paragraph({
        children: [new TextRun({ text: line.length ? line : ' ' })],
      }),
  )

  try {
    const res = await fetch(BETA_EMAIL_SIGNATURE_IMAGE_PATH)
    if (res.ok) {
      const buf = await res.arrayBuffer()
      const data = new Uint8Array(buf)
      paragraphs.push(
        new Paragraph({
          spacing: { before: 240 },
          children: [
            new ImageRun({
              data,
              transformation: { width: 520, height: 136 },
              type: 'png',
            }),
          ],
        }),
      )
    }
  } catch {
    /* signature optional */
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  })

  return Packer.toBlob(doc)
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
