import { BRAND_WITH_TM } from '../constants/brand'

function formatDate(value, language) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString(language || 'en')
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
  const summary = cleanInlineText(event?.summary || t('share.noSummary', { defaultValue: 'No summary' }))
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
      `*${t('share.cardTitle', { defaultValue: `${BRAND_WITH_TM} Log` })}*`,
      `• ${t('form.name')}: ${shortText(safeName, 70)}`,
      `• ${t('discover.speciesNameLabel')}: ${shortText(safeSpecies, 90)}`,
      `• ${t('share.eventLabel', { defaultValue: 'Event' })}: ${shortText(safeLabel, 50)}`,
      `• ${t('share.dateLabel', { defaultValue: 'Date' })}: ${safeDate}`,
      `• ${t('share.summaryLabel', { defaultValue: 'Summary' })}: ${shortText(summary, 240)}`,
      safeProfileUrl ? `• ${safeProfileUrl}` : null,
      '#TarantulApp',
    ].filter(Boolean).join('\n')
  }

  return [
    '━━━━━━━━━━━━━━━━━━━━',
    `${t('share.cardTitle', { defaultValue: `${BRAND_WITH_TM} Log` })}`,
    '━━━━━━━━━━━━━━━━━━━━',
    `📌 ${t('form.name')}: ${shortText(safeName, 90)}`,
    `🔬 ${t('discover.speciesNameLabel')}: ${shortText(safeSpecies, 110)}`,
    `📝 ${t('share.eventLabel', { defaultValue: 'Event' })}: ${shortText(safeLabel, 60)}`,
    `📅 ${t('share.dateLabel', { defaultValue: 'Date' })}: ${safeDate}`,
    `💬 ${t('share.summaryLabel', { defaultValue: 'Summary' })}: ${shortText(summary, 320)}`,
    safeProfileUrl ? `🔗 ${safeProfileUrl}` : null,
    '',
    '#TarantulApp #TarantulaHobby',
  ].filter(Boolean).join('\n')
}

export function buildPhotoShareText({ tarantulaName, speciesName, caption, t, profileUrl, channel = 'default' }) {
  const safeName = cleanInlineText(tarantulaName)
  const safeSpecies = cleanInlineText(speciesName)
  const note = cleanInlineText(typeof caption === 'string' ? caption : '', t('share.noCaption', { defaultValue: 'No note' }))
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
      `*📸 ${t('share.photoCardTitle', { defaultValue: `${BRAND_WITH_TM} Photo Log` })}*`,
      `• ${t('form.name')}: ${shortText(safeName, 70)}`,
      `• ${t('discover.speciesNameLabel')}: ${shortText(safeSpecies, 90)}`,
      `• ${t('share.captionLabel', { defaultValue: 'Note' })}: ${shortText(note, 240)}`,
      safeProfileUrl ? `• ${safeProfileUrl}` : null,
      '#TarantulApp',
    ].filter(Boolean).join('\n')
  }

  return [
    '━━━━━━━━━━━━━━━━━━━━',
    `📸 ${t('share.photoCardTitle', { defaultValue: `${BRAND_WITH_TM} Photo Log` })}`,
    '━━━━━━━━━━━━━━━━━━━━',
    `📌 ${t('form.name')}: ${shortText(safeName, 90)}`,
    `🔬 ${t('discover.speciesNameLabel')}: ${shortText(safeSpecies, 110)}`,
    `💬 ${t('share.captionLabel', { defaultValue: 'Note' })}: ${shortText(note, 320)}`,
    safeProfileUrl ? `🔗 ${safeProfileUrl}` : null,
    '',
    '#TarantulApp #TarantulaPhoto',
  ].filter(Boolean).join('\n')
}

export function buildKeeperProfileShareText({
  displayName,
  handle,
  bio,
  location,
  profileUrl,
  t,
  channel = 'default',
}) {
  const safeName = cleanInlineText(displayName, 'Keeper')
  const safeHandle = cleanInlineText(handle ? `@${String(handle).replace(/^@+/, '')}` : '', '@keeper')
  const safeBio = shortText(
    cleanInlineText(bio, t('share.noSummary', { defaultValue: `Keeper profile on ${BRAND_WITH_TM}` })),
    220
  )
  const safeLocation = cleanInlineText(location, '')
  const safeUrl = cleanInlineText(profileUrl, '')

  if (channel === 'instagram') {
    return [
      `${safeName} · ${safeHandle}`,
      safeLocation ? `📍 ${shortText(safeLocation, 70)}` : null,
      safeBio,
      '#TarantulApp #KeeperProfile #TarantulaCommunity',
    ].filter(Boolean).join('\n')
  }

  if (channel === 'whatsapp') {
    return [
      `*${t('share.keeperCardTitle', { defaultValue: `Keeper profile on ${BRAND_WITH_TM}` })}*`,
      `• ${t('form.name')}: ${shortText(safeName, 70)}`,
      `• ${t('account.profile.publicHandleLabel', { defaultValue: 'Handle' })}: ${shortText(safeHandle, 80)}`,
      safeLocation ? `• ${t('share.locationLabel', { defaultValue: 'Location' })}: ${shortText(safeLocation, 90)}` : null,
      `• ${t('share.summaryLabel', { defaultValue: 'Summary' })}: ${shortText(safeBio, 220)}`,
      safeUrl ? `• ${safeUrl}` : null,
      '#TarantulApp',
    ].filter(Boolean).join('\n')
  }

  return [
    '━━━━━━━━━━━━━━━━━━━━',
    t('share.keeperCardTitle', { defaultValue: `Keeper profile on ${BRAND_WITH_TM}` }),
    '━━━━━━━━━━━━━━━━━━━━',
    `👤 ${shortText(safeName, 90)} · ${shortText(safeHandle, 90)}`,
    safeLocation ? `📍 ${shortText(safeLocation, 120)}` : null,
    `💬 ${shortText(safeBio, 260)}`,
    safeUrl ? `🔗 ${safeUrl}` : null,
    '',
    '#TarantulApp #KeeperProfile',
  ].filter(Boolean).join('\n')
}
