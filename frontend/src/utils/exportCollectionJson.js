import tarantulaService from '../services/tarantulaService'

function pickImportableShape(item) {
  return {
    name: item?.name || '',
    speciesId: item?.species?.id ?? item?.speciesId ?? null,
    currentSizeCm: item?.currentSizeCm ?? null,
    stage: item?.stage || '',
    sex: item?.sex || '',
    purchaseDate: item?.purchaseDate || null,
    notes: item?.notes || '',
  }
}

export function downloadCollectionJson(tarantulas, filename = 'tarantulapp-collection.json') {
  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    items: Array.isArray(tarantulas) ? tarantulas.map(pickImportableShape) : [],
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function importCollectionJsonFile(file) {
  const text = await file.text()
  const data = JSON.parse(text)
  const items = Array.isArray(data?.items) ? data.items : []
  let created = 0
  let skipped = 0
  const errors = []

  for (const raw of items) {
    const row = pickImportableShape(raw)
    if (!row.name || !row.name.trim()) {
      skipped++
      continue
    }
    try {
      await tarantulaService.create(row)
      created++
    } catch (e) {
      skipped++
      errors.push(e?.response?.data?.error || e?.message || 'import_error')
    }
  }

  return { created, skipped, errors }
}
