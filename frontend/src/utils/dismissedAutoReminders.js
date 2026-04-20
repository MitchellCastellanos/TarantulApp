const STORAGE_KEY = 'tarantulapp.dismissedAutoReminders'

/** @param {{ source?: string, tarantulaId?: string, dueDate?: string }} r */
export function dismissedAutoReminderKey(r) {
  if (!r || r.source !== 'automatic' || !r.tarantulaId || !r.dueDate) return null
  return `${r.tarantulaId}|${r.dueDate}`
}

export function readDismissedAutoKeys() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set()
  }
}

/** @param {Set<string>} set */
export function writeDismissedAutoKeys(set) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
}

/** @param {{ source?: string, tarantulaId?: string, dueDate?: string }} r */
export function dismissAutomaticReminder(r) {
  const key = dismissedAutoReminderKey(r)
  if (!key) return
  const s = readDismissedAutoKeys()
  s.add(key)
  writeDismissedAutoKeys(s)
}
