/**
 * Construye una URL absoluta válida para codificar en un QR (http/https).
 * Acepta "ejemplo.com/ruta", "https://...", etc.
 */
export function parseUserUrl(input) {
  const t = (input ?? '').trim()
  if (!t) return { ok: false, empty: true }
  try {
    const href = /^https?:\/\//i.test(t) ? new URL(t).href : new URL(`https://${t}`).href
    const u = new URL(href)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: false, empty: false }
    return { ok: true, href: u.href }
  } catch {
    return { ok: false, empty: false }
  }
}
