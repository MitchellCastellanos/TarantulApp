export async function shareOrCopyText(text) {
  if (navigator.share) {
    await navigator.share({ text })
    return 'shared'
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return 'copied'
  }
  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.setAttribute('readonly', '')
  textArea.style.position = 'fixed'
  textArea.style.opacity = '0'
  document.body.appendChild(textArea)
  textArea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textArea)
  if (copied) return 'copied'
  return 'unsupported'
}

export function detectShareChannel() {
  const ua = (navigator.userAgent || '').toLowerCase()
  if (/\binstagram\b/.test(ua)) return 'instagram'
  if (/\bwhatsapp\b|\bwa\/\d/.test(ua)) return 'whatsapp'
  return 'default'
}
