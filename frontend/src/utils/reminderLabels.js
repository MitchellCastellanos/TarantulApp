/** Maps API reminder.type values to i18n keys under reminders.* */
const REMINDER_TYPE_KEYS = {
  feeding: 'reminders.typeFeeding',
  feeding_auto: 'reminders.typeFeedingAuto',
  cleaning: 'reminders.typeCleaning',
  checkup: 'reminders.typeCheckup',
  custom: 'reminders.typeCustom',
}

/** Localized fallback when a reminder has no custom message. */
export function reminderTypeLabel(type, t) {
  if (!type) return ''
  const key = REMINDER_TYPE_KEYS[String(type)]
  return key ? t(key) : String(type)
}

/** Primary line for list rows: user message, or localized type name. */
export function reminderPrimaryLabel(message, type, t) {
  const m = typeof message === 'string' ? message.trim() : ''
  if (m) return m
  return reminderTypeLabel(type, t)
}
