/** @param {{ createdAt?: string, dueDate?: string }} r */
function reminderSortKey(r) {
  return r?.createdAt || r?.dueDate || ''
}

/** Newest first (createdAt when present, otherwise dueDate). */
export function sortRemindersNewestFirst(reminders) {
  return [...reminders].sort(
    (a, b) => new Date(reminderSortKey(b)).getTime() - new Date(reminderSortKey(a)).getTime(),
  )
}
