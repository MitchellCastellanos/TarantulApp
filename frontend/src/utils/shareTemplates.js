function formatDate(value, language) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString(language || 'es')
}

function cleanInlineText(value, fallback = '-') {
  const text = String(value ?? '').trim()
  if (!text) return fallback
  return text
    .normalize('NFC')
    .replace(/[\u0000-\u001F\u007F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || fallback
}

function shortText(value, maxLength) {
  const text = cleanInlineText(value)
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

export function buildEventShareText({ tarantulaName, speciesName, event, t, language, profileUrl, channel = 'default' }) {
  const label = event?.type === 'molt'
    ? t('timeline.molt')
    : event?.type === 'feeding'
      ? t('timeline.feeding')
      : t('quickLog.behavior')
  const date = formatDate(event?.eventDate, language)
  const safeName = cleanInlineText(tarantulaName)
  const safeSpecies = cleanInlineText(speciesName)
  const safeLabel = cleanInlineText(label)
  const safeDate = cleanInlineText(date)
  const summary = cleanInlineText(event?.summary || t('share.noSummary', { defaultValue: 'Sin resumen' }))
  const safeProfileUrl = cleanInlineText(profileUrl, '')
  if (channel === 'instagram') {
    return [
      `${shortText(safeName, 50)} · ${shortText(safeSpecies, 70)}`,
      `${shortText(safeLabel, 40)} · ${safeDate}`,
      shortText(summary, 180),
      '#TarantulApp #TarantulaHobby #MoltLog',
    ].join('\n')
  }

  if (channel === 'whatsapp') {
    return [
      `*${t('share.cardTitle', { defaultValue: 'TarantulApp Log' })}*`,
      `• ${t('form.name')}: ${shortText(safeName, 70)}`,
      `• ${t('discover.speciesNameLabel')}: ${shortText(safeSpecies, 90)}`,
      `• ${t('share.eventLabel', { defaultValue: 'Evento' })}: ${shortText(safeLabel, 50)}`,
      `• ${t('share.dateLabel', { defaultValue: 'Fecha' })}: ${safeDate}`,
      `• ${t('share.summaryLabel', { defaultValue: 'Resumen' })}: ${shortText(summary, 240)}`,
      safeProfileUrl ? `• ${safeProfileUrl}` : null,
      '#TarantulApp',
    ].filter(Boolean).join('\n')
  }

  return [
    '━━━━━━━━━━━━━━━━━━━━',
    `${t('share.cardTitle', { defaultValue: 'TarantulApp Log' })}`,
    '━━━━━━━━━━━━━━━━━━━━',
    `📌 ${t('form.name')}: ${shortText(safeName, 90)}`,
    `🔬 ${t('discover.speciesNameLabel')}: ${shortText(safeSpecies, 110)}`,
    `📝 ${t('share.eventLabel', { defaultValue: 'Evento' })}: ${shortText(safeLabel, 60)}`,
    `📅 ${t('share.dateLabel', { defaultValue: 'Fecha' })}: ${safeDate}`,
    `💬 ${t('share.summaryLabel', { defaultValue: 'Resumen' })}: ${shortText(summary, 320)}`,
    safeProfileUrl ? `🔗 ${safeProfileUrl}` : null,
    '',
    '#TarantulApp #TarantulaHobby',
  ].filter(Boolean).join('\n')
}

export function buildPhotoShareText({ tarantulaName, speciesName, caption, t, profileUrl, channel = 'default' }) {
  const safeName = cleanInlineText(tarantulaName)
  const safeSpecies = cleanInlineText(speciesName)
  const note = cleanInlineText(typeof caption === 'string' ? caption : '', t('share.noCaption', { defaultValue: 'Sin nota' }))
  const safeProfileUrl = cleanInlineText(profileUrl, '')

  if (channel === 'instagram') {
    return [
      `📸 ${shortText(safeName, 50)} · ${shortText(safeSpecies, 70)}`,
      shortText(note, 180),
      '#TarantulApp #TarantulaPhoto',
    ].join('\n')
  }

  if (channel === 'whatsapp') {
    return [
      `*📸 ${t('share.photoCardTitle', { defaultValue: 'TarantulApp Photo Log' })}*`,
      `• ${t('form.name')}: ${shortText(safeName, 70)}`,
      `• ${t('discover.speciesNameLabel')}: ${shortText(safeSpecies, 90)}`,
      `• ${t('share.captionLabel', { defaultValue: 'Nota' })}: ${shortText(note, 240)}`,
      safeProfileUrl ? `• ${safeProfileUrl}` : null,
      '#TarantulApp',
    ].filter(Boolean).join('\n')
  }

  return [
    '━━━━━━━━━━━━━━━━━━━━',
    `📸 ${t('share.photoCardTitle', { defaultValue: 'TarantulApp Photo Log' })}`,
    '━━━━━━━━━━━━━━━━━━━━',
    `📌 ${t('form.name')}: ${shortText(safeName, 90)}`,
    `🔬 ${t('discover.speciesNameLabel')}: ${shortText(safeSpecies, 110)}`,
    `💬 ${t('share.captionLabel', { defaultValue: 'Nota' })}: ${shortText(note, 320)}`,
    safeProfileUrl ? `🔗 ${safeProfileUrl}` : null,
    '',
    '#TarantulApp #TarantulaPhoto',
  ].filter(Boolean).join('\n')
}
