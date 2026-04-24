import { jsPDF } from 'jspdf'
import { computeTerrariumRecommendation } from '../utils/terrariumEstimate'
import { pickSpeciesNarrativeField } from '../utils/speciesNarrative'

/** U+2122: jsPDF built-in font lo pinta; no pasar por `safe()` (el regex ASCII lo quitaria). */
const TRADEMARK = '\u2122'

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

/** @param {string|number|Date|null|undefined} raw */
function toDate(raw) {
  if (raw == null || raw === '') return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Días transcurridos desde `date` hacia el presente.
 * @param {string|number|Date|null|undefined} iso
 */
function daysSinceDate(iso, from = new Date()) {
  const d = toDate(iso)
  if (!d) return null
  return Math.floor((from.getTime() - d.getTime()) / (24 * 60 * 60 * 1000))
}

function formatDaysLabel(days, translate) {
  if (days == null || !Number.isFinite(days)) return translate('common.unknown')
  if (days < 0) return translate('common.unknown')
  return translate('share.daysAgo', { count: days })
}

/**
 * @param {import('react-i18next').TFunction} t
 * @param {{ type: string, title?: string, eventDate?: string }[]} timeline
 */
function computeTimelineStats(timeline) {
  const list = Array.isArray(timeline) ? timeline : []
  const now = Date.now()
  const win = 90 * 24 * 60 * 60 * 1000
  let feeding = 0
  let molt = 0
  let behavior = 0
  let f90 = 0
  let m90 = 0
  let b90 = 0
  /** @type {number[]} */
  const feedingTimes = []
  for (const e of list) {
    if (!e?.type) continue
    const t0 = toDate(e.eventDate)?.getTime() ?? NaN
    if (e.type === 'feeding') {
      feeding++
      if (Number.isFinite(t0) && !Number.isNaN(t0)) {
        if (now - t0 <= win) f90++
        feedingTimes.push(t0)
      }
    } else if (e.type === 'molt') {
      molt++
      if (Number.isFinite(t0) && !Number.isNaN(t0) && now - t0 <= win) m90++
    } else if (e.type === 'behavior') {
      behavior++
      if (Number.isFinite(t0) && !Number.isNaN(t0) && now - t0 <= win) b90++
    }
  }
  feedingTimes.sort((a, b) => a - b)
  let avgFeedingIntervalDays = null
  if (feedingTimes.length >= 2) {
    const gaps = []
    for (let i = 1; i < feedingTimes.length; i++) {
      gaps.push((feedingTimes[i] - feedingTimes[i - 1]) / (24 * 60 * 60 * 1000))
    }
    const sum = gaps.reduce((a, b) => a + b, 0)
    avgFeedingIntervalDays = sum / gaps.length
  }
  return {
    total: list.length,
    feeding,
    molt,
    behavior,
    f90,
    m90,
    b90,
    avgFeedingIntervalDays: avgFeedingIntervalDays != null
      ? Math.round(avgFeedingIntervalDays * 10) / 10
      : null,
  }
}

/**
 * @param {import('react-i18next').TFunction} t
 */
function pdfEventTitle(event, translate) {
  if (event.type === 'behavior' && event.title) {
    return `${translate('quickLog.behavior')}: ${translate(`timeline.${event.title}`, { defaultValue: String(event.title) })}`
  }
  const key = event.title || event.type
  if (!key) return '-'
  return translate(`timeline.${key}`, { defaultValue: String(key) })
}

/**
 * Misma lógica que en SpeciesProfileCard: ventilación, crecimiento, nivel
 * @param {Record<string, unknown> | null | undefined} species
 * @param {import('react-i18next').TFunction} t
 */
function speciesVentedLabel(species, translate) {
  const v = species?.ventilation
  if (!v) return translate('common.unknown')
  const s = String(v)
  return translate(`species.vent${s.charAt(0).toUpperCase() + s.slice(1)}`, { defaultValue: s })
}

function speciesGrowthLabel(species, translate) {
  const g = species?.growthRate
  if (!g) return translate('common.unknown')
  const s = String(g)
  return translate(`species.growth${s.charAt(0).toUpperCase() + s.slice(1)}`, { defaultValue: s })
}

function speciesLevelLabel(species, translate) {
  const lv = species?.experienceLevel
  if (!lv) return translate('common.unknown')
  const s = String(lv)
  return translate(`species.level${s.charAt(0).toUpperCase() + s.slice(1)}`, { defaultValue: s })
}

function speciesHobbyWorldLabel(species, translate) {
  if (species?.hobbyWorld === 'new_world') return translate('species.worldNewWorld')
  if (species?.hobbyWorld === 'old_world') return translate('species.worldOldWorld')
  return translate('common.unknown')
}

function publicProfileBaseUrl() {
  if (typeof window === 'undefined' || !window?.location?.origin) return ''
  return window.location.origin
}

export async function exportTarantulaPdf({ tarantula, species, timeline, t, language, i18n }) {
  const brandLogo = await fetchBrandLogoDataUrl()
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 42
  const contentWidth = pageWidth - margin * 2
  let y = margin
  const sp = species ?? tarantula?.species ?? null
  // Idioma fijo mientras dura el await + PDF (evita mezclas si getFixedT aplica a una sola lng)
  const resolvedLng = String(language || i18n?.language || 'en').split(/[-_]/)[0]
  const tr = typeof i18n?.getFixedT === 'function' ? i18n.getFixedT(resolvedLng) : t
  const localeForDates = String(language || i18n?.language || (resolvedLng === 'fr' ? 'fr' : 'en'))

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

  const drawWatermark = () => {
    if (!brandLogo) return
    let saved = false
    try {
      const wSize = 220
      const wX = (pageWidth - wSize) / 2
      const wY = (pageHeight - wSize) / 2
      if (typeof doc.saveGraphicsState === 'function') {
        doc.saveGraphicsState()
        saved = true
      }
      if (typeof doc.GState === 'function') {
        doc.setGState(doc.GState({ opacity: 0.05 }))
        doc.addImage(brandLogo, 'PNG', wX, wY, wSize, wSize)
        doc.setGState(doc.GState({ opacity: 1 }))
      }
    } catch { /* ignore */ }
    finally {
      if (saved && typeof doc.restoreGraphicsState === 'function') {
        doc.restoreGraphicsState()
      }
    }
  }

  const drawHeader = () => {
    const logoSize = 50
    const headerH = 74

    // Gold accent top strip
    doc.setFillColor(201, 168, 76)
    doc.roundedRect(margin, y, contentWidth, 6, 3, 3, 'F')
    y += 6

    // Dark header block
    doc.setFillColor(22, 24, 32)
    doc.roundedRect(margin, y, contentWidth, headerH, 4, 4, 'F')

    // Logo left-aligned inside header
    if (brandLogo) {
      try {
        const logoY = y + (headerH - logoSize) / 2
        doc.addImage(brandLogo, 'PNG', margin + 12, logoY, logoSize, logoSize)
      } catch { /* ignore */ }
    }

    // Text block to the right of the logo
    const textX = margin + (brandLogo ? logoSize + 24 : 14)
    doc.setTextColor(245, 245, 245)
    doc.setFontSize(18)
    doc.setFont(undefined, 'bold')
    doc.text(`TARANTULAPP${TRADEMARK}`, textX, y + 26)
    doc.setFontSize(11)
    doc.setFont(undefined, 'normal')
    doc.text(safe(tr('share.careSheetTitle')), textX, y + 43)
    doc.setFontSize(8.5)
    doc.setTextColor(200, 200, 200)
    doc.text(
      `${safe(tr('share.generatedAt', { defaultValue: 'Generated' }))}: ${safe(new Date().toLocaleString(localeForDates))}`,
      textX,
      y + 58,
    )

    y += headerH + 14
    doc.setTextColor(20, 20, 20)
  }

  const sectionTitle = (title, subtitle = '') => {
    const boxH = subtitle ? 44 : 26
    ensureSpace(boxH + 6)
    doc.setFillColor(245, 245, 245)
    doc.roundedRect(margin, y - 12, contentWidth, boxH, 6, 6, 'F')
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(45, 45, 45)
    doc.text(safe(title), margin + 10, y + 5)
    if (subtitle) {
      doc.setFontSize(9.5)
      doc.setFont(undefined, 'normal')
      doc.setTextColor(90, 90, 90)
      doc.text(safe(subtitle), margin + 10, y + 21)
      y += 38
      return
    }
    y += 22
  }

  /** Etiqueta en negrita y debajo el valor a todo el ancho (evita choque con etiquetas largas). */
  const lineHeight = 12
  const labelGap = 12

  const infoRow = (label, value) => {
    const vLines = doc.splitTextToSize(safe(value), contentWidth)
    const blockH = labelGap + vLines.length * lineHeight
    ensureSpace(8 + blockH + 6)
    doc.setFontSize(10.5)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(75, 75, 75)
    doc.text(`${safe(label)}:`, margin, y)
    const valueStartY = y + labelGap
    doc.setFont(undefined, 'normal')
    doc.setTextColor(20, 20, 20)
    let vY = valueStartY
    for (const vl of vLines) {
      doc.text(vl, margin, vY)
      vY += lineHeight
    }
    y = vY + 6
  }

  /**
   * Dos columnas de texto, sin cajas (evita rectangulos sólidos/artefactos con GState en visores).
   * @param {{ label: string, value: string }[]} rows
   */
  const infoGrid = (rows) => {
    const colGap = 14
    const colW = (contentWidth - colGap) / 2
    for (let i = 0; i < rows.length; i += 2) {
      const left = rows[i]
      const right = rows[i + 1]
      const leftLines = doc.splitTextToSize(
        `${safe(left.label)}: ${safe(left.value)}`,
        colW - 4,
      )
      const rightLines = right
        ? doc.splitTextToSize(`${safe(right.label)}: ${safe(right.value)}`, colW - 4)
        : []
      const n = right ? Math.max(leftLines.length, rightLines.length) : leftLines.length
      const rowH = 10 + n * lineHeight
      ensureSpace(rowH + 4)
      doc.setFontSize(10)
      doc.setFont(undefined, 'normal')
      doc.setTextColor(30, 30, 30)
      const y0 = y
      for (let j = 0; j < n; j++) {
        if (j < leftLines.length) {
          doc.text(leftLines[j], margin + 2, y0 + 10 + j * lineHeight)
        }
        if (right && j < rightLines.length) {
          doc.text(rightLines[j], margin + colW + colGap, y0 + 10 + j * lineHeight)
        }
      }
      y = y0 + rowH
    }
  }

  const paragraph = (text) => {
    const lines = doc.splitTextToSize(safe(text), contentWidth)
    const needed = 8 + lines.length * lineHeight
    ensureSpace(needed)
    doc.setFontSize(10.5)
    doc.setFont(undefined, 'normal')
    doc.setTextColor(25, 25, 25)
    let pY = y
    for (const ln of lines) {
      doc.text(ln, margin, pY)
      pY += lineHeight
    }
    y = pY + 6
  }

  const lastFed = tarantula?.lastFedAt
  const lastMolt = tarantula?.lastMoltAt
  const dSinceFed = daysSinceDate(lastFed)
  const dSinceMolt = daysSinceDate(lastMolt)
  const purchaseD = tarantula?.purchaseDate
  const dInCollection = purchaseD != null && purchaseD !== '' ? daysSinceDate(purchaseD) : null
  const stats = computeTimelineStats(timeline)
  const terrariumRec = computeTerrariumRecommendation(tarantula?.currentSizeCm, sp)

  const statusKey = tarantula?.status
  const statusLabel = statusKey
    ? tr(`status.${statusKey}`, { defaultValue: String(statusKey) })
    : tr('common.unknown')

  const stageLabel = tarantula?.stage
    ? tr(`stages.${tarantula.stage}`, { defaultValue: String(tarantula.stage) })
    : tr('common.unknown')

  const sexLabel = tarantula?.sex
    ? tr(`sex.${tarantula.sex}`, { defaultValue: String(tarantula.sex) })
    : tr('common.unknown')

  const speciesNameLine = sp
    ? [sp.scientificName, sp.commonName].filter(Boolean).join(' · ') || tr('common.unknown')
    : tr('common.unknown')

  const base = publicProfileBaseUrl()
  const publicUrl = tarantula?.shortId
    ? (base ? `${base}/t/${tarantula.shortId}` : `/t/${tarantula.shortId}`)
    : tr('common.unknown')

  const lastFedText = lastFed
    ? `${toDate(lastFed).toLocaleString(localeForDates)} (${formatDaysLabel(dSinceFed, tr)})`
    : tr('common.unknown')
  const lastMoltText = lastMolt
    ? `${toDate(lastMolt).toLocaleString(localeForDates)} (${formatDaysLabel(dSinceMolt, tr)})`
    : tr('common.unknown')
  const purchaseText = tarantula?.purchaseDate
    ? `${toDate(tarantula.purchaseDate).toLocaleDateString(localeForDates)} (${
        dInCollection != null
          ? tr('share.collectionDays', { count: dInCollection })
          : tr('common.unknown')
      })`
    : tr('common.unknown')
  const createdText = tarantula?.createdAt
    ? toDate(tarantula.createdAt).toLocaleString(localeForDates)
    : tr('common.unknown')
  const updatedText = tarantula?.updatedAt
    ? toDate(tarantula.updatedAt).toLocaleString(localeForDates)
    : tr('common.unknown')
  const lockedText = tarantula?.locked === true
    ? tr('share.lockedTrue')
    : tr('share.lockedFalse')
  const isPublicText = tarantula?.isPublic === true ? tr('share.yes') : tr('share.no')

  const langForNarrative = String(language || i18n?.language || 'en')
  const temperamentNarr = sp
    ? pickSpeciesNarrativeField(sp.narrativeI18n, 'temperament', langForNarrative)
      ?? (sp.temperament != null && String(sp.temperament).trim() ? String(sp.temperament) : null)
    : null
  const substrateNarr = sp
    ? pickSpeciesNarrativeField(sp.narrativeI18n, 'substrate', langForNarrative) ?? (sp.substrateType || null)
    : null
  const careNarr = sp
    ? pickSpeciesNarrativeField(sp.narrativeI18n, 'careNotes', langForNarrative) ?? (sp.careNotes || null)
    : null

  drawHeader()
  sectionTitle(
    tr('share.snapshotTitle', { defaultValue: 'Specimen snapshot' }),
    tr('share.snapshotSubtitle', { defaultValue: 'Core data for registry and handling' }),
  )
  infoGrid([
    { label: tr('form.name'), value: tarantula?.name || tr('common.unknown') },
    { label: tr('discover.speciesNameLabel'), value: speciesNameLine },
  ])
  infoGrid([
    { label: tr('share.pdfStatusLabel'), value: statusLabel },
    { label: tr('form.stage'), value: stageLabel },
  ])
  infoGrid([
    { label: tr('form.sex'), value: sexLabel },
    { label: tr('form.currentSize'), value: tarantula?.currentSizeCm != null ? String(tarantula.currentSizeCm) : tr('common.unknown') },
  ])
  infoGrid([
    { label: tr('tarantula.purchaseDate'), value: purchaseText },
    { label: tr('tarantula.lastFed'), value: lastFedText },
  ])
  infoGrid([
    { label: tr('tarantula.lastMolt'), value: lastMoltText },
    { label: tr('dashboard.exportCols.shortId'), value: tarantula?.shortId || tr('common.unknown') },
  ])
  if (tarantula?.deceasedAt) {
    infoRow(
      tr('tarantula.deceasedOn'),
      `${toDate(tarantula.deceasedAt).toLocaleString(localeForDates)}${
        tarantula.deathNotes ? ` — ${tarantula.deathNotes}` : ''
      }`,
    )
  }
  y += 4
  sectionTitle(
    tr('share.indicatorsTitle', { defaultValue: 'Profile, plan, and traceability' }),
    tr('share.indicatorsSubtitle', { defaultValue: 'Public profile, link, and plan limits' }),
  )
  y += 3
  infoGrid([
    { label: tr('share.pdfPublicLabel'), value: isPublicText },
    { label: tr('share.pdfLockedLabel'), value: lockedText },
  ])
  infoRow(tr('share.pdfProfileUrl'), publicUrl)
  infoRow(tr('share.pdfCreatedAt'), createdText)
  infoRow(tr('share.pdfUpdatedAt'), updatedText)
  if (tarantula?.notes) {
    infoRow(tr('form.notes'), tarantula.notes)
  }

  y += 6
  if (sp) {
    sectionTitle(
      tr('share.speciesBlockTitle', { defaultValue: 'Species parameters' }),
      tr('share.speciesBlockSubtitle', { defaultValue: 'Catalog reference' }),
    )
    y += 3
    const habitatValue = sp.habitatType
      ? tr(`habitat.${sp.habitatType}`, { defaultValue: String(sp.habitatType) })
      : tr('common.unknown')
    infoGrid([
      { label: tr('species.origin'), value: sp.originRegion || tr('common.unknown') },
      { label: tr('species.hobbyWorld'), value: speciesHobbyWorldLabel(sp, tr) },
    ])
    infoGrid([
      { label: tr('species.habitat'), value: habitatValue },
      { label: tr('species.adultSize'),
        value: (sp.adultSizeCmMin != null || sp.adultSizeCmMax != null)
          ? `${sp.adultSizeCmMin ?? '?'} – ${sp.adultSizeCmMax ?? '?'} cm`
          : tr('common.unknown') },
    ])
    infoGrid([
      { label: tr('species.growth'), value: speciesGrowthLabel(sp, tr) },
      { label: tr('species.level'), value: speciesLevelLabel(sp, tr) },
    ])
    infoGrid([
      { label: tr('species.humidity'),
        value: (sp.humidityMin != null && sp.humidityMax != null) ? `${sp.humidityMin} – ${sp.humidityMax} %` : tr('common.unknown') },
      { label: tr('species.ventilation'), value: speciesVentedLabel(sp, tr) },
    ])
    if (temperamentNarr) {
      infoRow(tr('species.temperament'), temperamentNarr)
    }
    if (substrateNarr) {
      infoRow(tr('species.substrate'), String(substrateNarr))
    }
    if (careNarr) {
      infoRow(tr('share.speciesCareBlock'), String(careNarr))
    }
    y += 6
  }

  if (terrariumRec && tarantula?.currentSizeCm) {
    sectionTitle(
      tr('share.terrariumBlockTitle'),
      tr('share.terrariumPdfSubtitle', { defaultValue: 'Heuristic from size and lifestyle' }),
    )
    y += 2
    const encl = tr(terrariumRec.enclosureI18n.key, terrariumRec.enclosureI18n.params)
    infoRow(tr('share.terrariumEnclosureLabel'), encl)
    if (terrariumRec.pct != null) {
      infoRow(
        tr('terrarium.growthToAdult'),
        `${terrariumRec.pct} %${
          terrariumRec.adultSizeCmMax != null
            ? ` (${tr('terrarium.expectedAdult')}: ${terrariumRec.adultSizeCmMax} cm)`
            : ''
        }`,
      )
    }
    paragraph(tr('terrarium.estimatedNote'))
    y += 6
  }

  y += 2
  sectionTitle(
    tr('share.statsBlockTitle', { defaultValue: 'Logbook summary' }),
    tr('share.statsBlockSubtitle', { defaultValue: 'Counts and feeding spacing' }),
  )
  y += 2
  infoRow(tr('share.pdfTotalEvents'), String(stats.total))
  infoGrid([
    { label: tr('share.pdfCountFeeding'), value: String(stats.feeding) },
    { label: tr('share.pdfCountMolt'), value: String(stats.molt) },
  ])
  infoGrid([
    { label: tr('share.pdfCountBehavior'), value: String(stats.behavior) },
    { label: tr('share.pdfLast90'),
      value: tr('share.pdfLast90Value', { f: stats.f90, m: stats.m90, b: stats.b90 }) },
  ])
  if (stats.avgFeedingIntervalDays != null) {
    infoRow(tr('share.pdfAvgFeeding'), tr('share.pdfAvgFeedingValue', { days: stats.avgFeedingIntervalDays }))
  } else {
    infoRow(tr('share.pdfAvgFeeding'), tr('share.notEnoughData', { defaultValue: '—' }))
  }
  y += 8
  sectionTitle(
    tr('tarantula.history'),
    tr('share.historySubtitle', { defaultValue: 'Latest recorded events' }),
  )
  y += 4
  const recent = Array.isArray(timeline) ? timeline.slice(0, 10) : []
  if (recent.length === 0) {
    paragraph(`- ${tr('tarantula.historyEmpty')}`)
  } else {
    recent.forEach((e, idx) => {
      const date = e?.eventDate ? toDate(e.eventDate).toLocaleString(localeForDates) : tr('common.unknown')
      const eventTitle = pdfEventTitle(e, tr)
      const eventSummary = e?.summary ? ` | ${e.summary}` : ''
      paragraph(`${idx + 1}. ${date} - ${eventTitle}${eventSummary}`)
    })
  }

  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    drawWatermark()
    doc.setDrawColor(225, 225, 225)
    doc.line(margin, pageHeight - 28, pageWidth - margin, pageHeight - 28)
    doc.setFontSize(9)
    doc.setTextColor(88, 88, 88)
    doc.text(`TarantulApp${TRADEMARK}`, margin, pageHeight - 16)
    doc.text(`${i}/${totalPages}`, pageWidth - margin, pageHeight - 18, { align: 'right' })
  }

  const safeName = (tarantula?.name || 'tarantula').replace(/[^\w\-]+/g, '_')
  doc.save(`${safeName}_care_sheet.pdf`)
}
