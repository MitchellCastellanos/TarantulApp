function formatDate(value, language) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString(language || 'es')
}

export function buildEventShareText({ tarantulaName, speciesName, event, t, language, profileUrl, channel = 'default' }) {
  const label = event?.type === 'molt'
    ? t('timeline.molt')
    : event?.type === 'feeding'
      ? t('timeline.feeding')
      : t('quickLog.behavior')
  const date = formatDate(event?.eventDate, language)
  const summary = event?.summary || t('share.noSummary', { defaultValue: 'Sin resumen' })
  if (channel === 'instagram') {
    return [
      `🕷️ ${tarantulaName} · ${speciesName || '-'}`,
      `${label} · ${date}`,
      `${summary}`,
      '#TarantulApp #TarantulaHobby #MoltLog',
    ].join('\n')
  }

  if (channel === 'whatsapp') {
    return [
      `*🕷️ ${t('share.cardTitle', { defaultValue: 'TarantulApp Log' })}*`,
      `• ${t('form.name')}: ${tarantulaName}`,
      `• ${t('discover.speciesNameLabel')}: ${speciesName || '-'}`,
      `• ${t('share.eventLabel', { defaultValue: 'Evento' })}: ${label}`,
      `• ${t('share.dateLabel', { defaultValue: 'Fecha' })}: ${date}`,
      `• ${t('share.summaryLabel', { defaultValue: 'Resumen' })}: ${summary}`,
      profileUrl ? `• ${profileUrl}` : null,
      '#TarantulApp',
    ].filter(Boolean).join('\n')
  }

  return [
    '━━━━━━━━━━━━━━━━━━━━',
    `🕷️ ${t('share.cardTitle', { defaultValue: 'TarantulApp Log' })}`,
    '━━━━━━━━━━━━━━━━━━━━',
    `📌 ${t('form.name')}: ${tarantulaName}`,
    `🔬 ${t('discover.speciesNameLabel')}: ${speciesName || '-'}`,
    `📝 ${t('share.eventLabel', { defaultValue: 'Evento' })}: ${label}`,
    `📅 ${t('share.dateLabel', { defaultValue: 'Fecha' })}: ${date}`,
    `💬 ${t('share.summaryLabel', { defaultValue: 'Resumen' })}: ${summary}`,
    profileUrl ? `🔗 ${profileUrl}` : null,
    '',
    '#TarantulApp #TarantulaHobby',
  ].filter(Boolean).join('\n')
}

export function buildPhotoShareText({ tarantulaName, speciesName, caption, t, profileUrl, channel = 'default' }) {
  const note = typeof caption === 'string' ? caption : ''

  if (channel === 'instagram') {
    return [
      `📸 ${tarantulaName} · ${speciesName || '-'}`,
      `${note || t('share.noCaption', { defaultValue: 'Sin nota' })}`,
      '#TarantulApp #TarantulaPhoto',
    ].join('\n')
  }

  if (channel === 'whatsapp') {
    return [
      `*📸 ${t('share.photoCardTitle', { defaultValue: 'TarantulApp Photo Log' })}*`,
      `• ${t('form.name')}: ${tarantulaName}`,
      `• ${t('discover.speciesNameLabel')}: ${speciesName || '-'}`,
      `• ${t('share.captionLabel', { defaultValue: 'Nota' })}: ${note || t('share.noCaption', { defaultValue: 'Sin nota' })}`,
      profileUrl ? `• ${profileUrl}` : null,
      '#TarantulApp',
    ].filter(Boolean).join('\n')
  }

  return [
    '━━━━━━━━━━━━━━━━━━━━',
    `📸 ${t('share.photoCardTitle', { defaultValue: 'TarantulApp Photo Log' })}`,
    '━━━━━━━━━━━━━━━━━━━━',
    `📌 ${t('form.name')}: ${tarantulaName}`,
    `🔬 ${t('discover.speciesNameLabel')}: ${speciesName || '-'}`,
    `💬 ${t('share.captionLabel', { defaultValue: 'Nota' })}: ${note || t('share.noCaption', { defaultValue: 'Sin nota' })}`,
    profileUrl ? `🔗 ${profileUrl}` : null,
    '',
    '#TarantulApp #TarantulaPhoto',
  ].filter(Boolean).join('\n')
}
