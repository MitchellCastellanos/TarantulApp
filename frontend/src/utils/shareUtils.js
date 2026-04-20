export async function shareOrCopyText(text) {
  if (navigator.share) {
    await navigator.share({ text })
    return 'shared'
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return 'copied'
  }
  return 'unsupported'
}

export function detectShareChannel() {
  const ua = (navigator.userAgent || '').toLowerCase()
  if (ua.includes('instagram')) return 'instagram'
  if (ua.includes('whatsapp') || ua.includes('wa')) return 'whatsapp'
  return 'default'
}
