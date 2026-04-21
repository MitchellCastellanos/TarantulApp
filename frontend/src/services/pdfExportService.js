import { jsPDF } from 'jspdf'

async function fetchBrandLogoDataUrl() {
  try {
    const r = await fetch('/logo-black.png?v=2')
    if (!r.ok) return null
    const blob = await r.blob()
    return await new Promise((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result)
      fr.onerror = reject
      fr.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function exportTarantulaPdf({ tarantula, species, timeline, t, language }) {
  const brandLogo = await fetchBrandLogoDataUrl()
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 42
  const contentWidth = pageWidth - margin * 2
  let y = margin

  const addNewPage = () => {
    doc.addPage()
    y = margin
  }

  const safe = (value) => {
    const raw = String(value ?? '-')
    return raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove diacritics for built-in PDF fonts
      .replace(/[^\x20-\x7E\n]/g, '')  // strip unsupported chars (emoji/symbols)
      .replace(/\s+/g, ' ')
      .trim() || '-'
  }

  const ensureSpace = (needed = 24) => {
    if (y + needed > pageHeight - margin) addNewPage()
  }

  const drawHeader = () => {
    // Brand strip
    doc.setFillColor(201, 168, 76)
    doc.roundedRect(margin, y - 12, contentWidth, 10, 5, 5, 'F')

    doc.setFillColor(22, 24, 32)
    doc.roundedRect(margin, y, contentWidth, 70, 8, 8, 'F')
    if (brandLogo) {
      try {
        doc.addImage(brandLogo, 'PNG', pageWidth - margin - 52, y + 10, 44, 44)
      } catch {
        /* ignore bad image */
      }
    }
    doc.setTextColor(245, 245, 245)
    doc.setFontSize(19)
    doc.setFont(undefined, 'bold')
    doc.text('TARANTULAPP', margin + 14, y + 24)
    doc.setFontSize(13)
    doc.setFont(undefined, 'normal')
    doc.text(safe(t('share.careSheetTitle')), margin + 14, y + 42)
    doc.setFontSize(9.5)
    doc.text(
      `${safe(t('share.generatedAt', { defaultValue: 'Generado' }))}: ${safe(new Date().toLocaleString(language || 'es'))}`,
      margin + 14,
      y + 58,
    )
    y += 86
    doc.setTextColor(20, 20, 20)
  }

  const sectionTitle = (title, subtitle = '') => {
    ensureSpace(24)
    doc.setFillColor(245, 245, 245)
    doc.roundedRect(margin, y - 12, contentWidth, 26, 6, 6, 'F')
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(45, 45, 45)
    doc.text(safe(title), margin + 10, y + 5)
    if (subtitle) {
      doc.setFontSize(9.5)
      doc.setFont(undefined, 'normal')
      doc.setTextColor(90, 90, 90)
      doc.text(safe(subtitle), margin + 10, y + 18)
      y += 30
      return
    }
    y += 22
  }

  const infoRow = (label, value) => {
    ensureSpace(20)
    doc.setFontSize(10.5)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(75, 75, 75)
    doc.text(`${safe(label)}:`, margin, y)
    doc.setFont(undefined, 'normal')
    doc.setTextColor(20, 20, 20)
    const lines = doc.splitTextToSize(safe(value), contentWidth - 115)
    doc.text(lines, margin + 115, y)
    y += Math.max(16, lines.length * 13)
  }

  const infoGrid = (rows) => {
    const colGap = 14
    const colWidth = (contentWidth - colGap) / 2
    for (let i = 0; i < rows.length; i += 2) {
      const left = rows[i]
      const right = rows[i + 1]
      const leftLines = doc.splitTextToSize(`${safe(left.label)}: ${safe(left.value)}`, colWidth - 20)
      const rightLines = right
        ? doc.splitTextToSize(`${safe(right.label)}: ${safe(right.value)}`, colWidth - 20)
        : []
      const leftHeight = Math.max(34, leftLines.length * 12 + 16)
      const rightHeight = right ? Math.max(34, rightLines.length * 12 + 16) : 0
      const rowHeight = Math.max(leftHeight, rightHeight)
      ensureSpace(rowHeight + 8)

      doc.setFillColor(252, 252, 252)
      doc.setDrawColor(228, 228, 228)

      doc.roundedRect(margin, y - 12, colWidth, leftHeight, 6, 6, 'FD')
      doc.setFontSize(10)
      doc.setTextColor(30, 30, 30)
      doc.text(leftLines, margin + 10, y + 4)

      if (right) {
        const rightX = margin + colWidth + colGap
        doc.roundedRect(rightX, y - 12, colWidth, rightHeight, 6, 6, 'FD')
        doc.text(rightLines, rightX + 10, y + 4)
      }

      y += rowHeight + 8
    }
  }

  const paragraph = (text) => {
    const lines = doc.splitTextToSize(safe(text), contentWidth)
    const needed = Math.max(16, lines.length * 13 + 6)
    ensureSpace(needed)
    doc.setFontSize(10.5)
    doc.setFont(undefined, 'normal')
    doc.setTextColor(25, 25, 25)
    doc.text(lines, margin, y)
    y += needed
  }

  drawHeader()
  sectionTitle(
    t('share.snapshotTitle', { defaultValue: 'Resumen del ejemplar' }),
    t('share.snapshotSubtitle', { defaultValue: 'Datos principales para registro y manejo' }),
  )
  infoGrid([
    { label: t('form.name'), value: tarantula?.name || '-' },
    { label: t('discover.speciesNameLabel'), value: species?.scientificName || '-' },
    { label: t('species.habitat'), value: species?.habitatType || '-' },
    { label: t('species.humidity'), value: `${species?.humidityMin ?? '-'} - ${species?.humidityMax ?? '-'}` },
    { label: t('species.temperament'), value: species?.temperament || '-' },
    { label: t('form.currentSize'), value: tarantula?.currentSizeCm ?? '-' },
    { label: t('form.stage'), value: tarantula?.stage || '-' },
    { label: t('form.sex'), value: tarantula?.sex || '-' },
  ])
  infoRow(t('form.notes'), tarantula?.notes || '-')

  y += 8
  sectionTitle(
    t('share.pedigreeTitle'),
    t('share.pedigreeSubtitle', { defaultValue: 'Base inicial editable para breeding' }),
  )
  y += 3
  infoGrid([
    { label: t('share.pedigreeFather'), value: t('share.pedigreeUnknown') },
    { label: t('share.pedigreeMother'), value: t('share.pedigreeUnknown') },
  ])
  paragraph(t('share.pedigreeNote'))

  y += 8
  sectionTitle(
    t('tarantula.history'),
    t('share.historySubtitle', { defaultValue: 'Ultimos eventos registrados' }),
  )
  y += 4
  const recent = Array.isArray(timeline) ? timeline.slice(0, 10) : []
  if (recent.length === 0) {
    paragraph(`- ${t('tarantula.historyEmpty')}`)
  } else {
    recent.forEach((e, idx) => {
      const date = e?.eventDate ? new Date(e.eventDate).toLocaleDateString(language || 'es') : '-'
      const eventTitle = e?.title || e?.type || '-'
      const eventSummary = e?.summary ? ` | ${e.summary}` : ''
      paragraph(`${idx + 1}. ${date} - ${eventTitle}${eventSummary}`)
    })
  }

  const totalPages = doc.getNumberOfPages()
  doc.setFontSize(9)
  doc.setTextColor(110, 110, 110)
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setDrawColor(225, 225, 225)
    doc.line(margin, pageHeight - 28, pageWidth - margin, pageHeight - 28)
    doc.setTextColor(88, 88, 88)
    doc.text('TarantulApp', margin, pageHeight - 16)
    doc.text(`${i}/${totalPages}`, pageWidth - margin, pageHeight - 18, { align: 'right' })
  }

  const safeName = (tarantula?.name || 'tarantula').replace(/[^\w\-]+/g, '_')
  doc.save(`${safeName}_care_pedigree.pdf`)
}
