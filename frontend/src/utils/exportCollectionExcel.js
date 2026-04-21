import { formatDateInUserZone, formatDateTimeInUserZone } from './dateFormat'
import { BRAND_LOGO_FOR_LIGHT_BG } from './qrBrandComposite'

function colName(t, key) {
  return t(`dashboard.exportCols.${key}`)
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function exportFilenameBase() {
  const d = new Date()
  return `tarantulapp-collection-${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/**
 * @param {object[]} tarantulas
 * @param {import('i18next').TFunction} t
 * @param {string} i18nLang
 */
export async function exportTarantulaCollectionToExcel(tarantulas, t, i18nLang) {
  const ExcelJS = (await import('exceljs')).default

  const labelStage = (s) => (s ? t(`stages.${s}`, { defaultValue: s || '' }) : '')
  const labelSex = (s) => (s ? t(`sex.${s}`, { defaultValue: s || '' }) : '')
  const labelStatus = (s) => (s ? t(`status.${s}`, { defaultValue: s || '' }) : '')
  const labelHabitat = (h) => (h ? t(`habitat.${h}`, { defaultValue: h || '' }) : '')
  const labelHobbyWorld = (hw) => {
    if (hw === 'new_world') return t('dashboard.exportHobbyNewWorld')
    if (hw === 'old_world') return t('dashboard.exportHobbyOldWorld')
    return ''
  }

  const rows = tarantulas.map((tr) => {
    const purchase = tr.purchaseDate
      ? formatDateInUserZone(`${tr.purchaseDate}T12:00:00.000Z`, i18nLang)
      : ''
    return {
      [colName(t, 'name')]: tr.name ?? '',
      [colName(t, 'scientificName')]: tr.species?.scientificName ?? '',
      [colName(t, 'commonName')]: tr.species?.commonName ?? '',
      [colName(t, 'habitat')]: labelHabitat(tr.species?.habitatType),
      [colName(t, 'hobbyWorld')]: labelHobbyWorld(tr.species?.hobbyWorld),
      [colName(t, 'stage')]: labelStage(tr.stage),
      [colName(t, 'sex')]: labelSex(tr.sex),
      [colName(t, 'sizeCm')]: tr.currentSizeCm != null ? String(tr.currentSizeCm) : '',
      [colName(t, 'status')]: labelStatus(tr.status),
      [colName(t, 'purchaseDate')]: purchase,
      [colName(t, 'lastFed')]: tr.lastFedAt
        ? formatDateTimeInUserZone(tr.lastFedAt, i18nLang)
        : '',
      [colName(t, 'lastMolt')]: tr.lastMoltAt
        ? formatDateTimeInUserZone(tr.lastMoltAt, i18nLang)
        : '',
      [colName(t, 'deceasedAt')]: tr.deceasedAt
        ? formatDateTimeInUserZone(tr.deceasedAt, i18nLang)
        : '',
      [colName(t, 'notes')]: tr.notes ?? '',
      [colName(t, 'deathNotes')]: tr.deathNotes ?? '',
      [colName(t, 'publicProfile')]: tr.isPublic ? t('dashboard.exportBoolYes') : t('dashboard.exportBoolNo'),
      [colName(t, 'shortId')]: tr.shortId ?? '',
      [colName(t, 'readOnlyLocked')]: tr.locked ? t('dashboard.exportBoolYes') : t('dashboard.exportBoolNo'),
    }
  })

  const wb = new ExcelJS.Workbook()
  const sheetTitle = t('dashboard.exportSheetName').slice(0, 31)
  const ws = wb.addWorksheet(sheetTitle || 'Collection')

  let logoBuffer = null
  try {
    const res = await fetch(BRAND_LOGO_FOR_LIGHT_BG)
    if (res.ok) logoBuffer = await res.arrayBuffer()
  } catch {
    /* sin logo el archivo sigue siendo válido */
  }
  if (logoBuffer?.byteLength) {
    const imageId = wb.addImage({ buffer: logoBuffer, extension: 'png' })
    ws.mergeCells('A1:H3')
    ws.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: 132, height: 132 },
    })
    ws.getRow(1).height = 28
    ws.getRow(2).height = 28
    ws.getRow(3).height = 28
  }

  const headerRowIndex = logoBuffer?.byteLength ? 5 : 1
  const keys = rows.length ? Object.keys(rows[0]) : []
  const headerRow = ws.getRow(headerRowIndex)
  keys.forEach((key, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = key
    cell.font = { bold: true }
  })

  rows.forEach((obj, ri) => {
    const r = ws.getRow(headerRowIndex + 1 + ri)
    keys.forEach((key, ci) => {
      r.getCell(ci + 1).value = obj[key] ?? ''
    })
  })

  keys.forEach((_, ci) => {
    const col = ws.getColumn(ci + 1)
    col.width = Math.min(48, Math.max(12, String(keys[ci]).length + 4))
  })

  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${exportFilenameBase()}.xlsx`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
