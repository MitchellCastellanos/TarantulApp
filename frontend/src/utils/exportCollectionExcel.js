import { formatDateInUserZone, formatDateTimeInUserZone } from './dateFormat'

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
  const XLSX = await import('xlsx')

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

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  const sheetTitle = t('dashboard.exportSheetName').slice(0, 31)
  XLSX.utils.book_append_sheet(wb, ws, sheetTitle)
  XLSX.writeFile(wb, `${exportFilenameBase()}.xlsx`)
}
