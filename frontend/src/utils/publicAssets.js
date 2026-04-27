/**
 * Rutas a archivos en `public/` respetando import.meta.env.BASE_URL (subcarpetas / producción).
 */
export function publicUrl(path) {
  const base = import.meta.env.BASE_URL || '/'
  const normalized = base.endsWith('/') ? base : `${base}/`
  const rel = String(path || '').replace(/^\//, '')
  return `${normalized}${rel}`
}

/** Define variables CSS usadas en index.css para url(...) de assets públicos. */
export function initPublicAssets() {
  const root = document.documentElement
  const u = (file) => `url("${publicUrl(file)}")`
  root.style.setProperty('--ta-url-bg-texture', u('bg-texture.png'))
  root.style.setProperty('--ta-url-spider-silhouette', u('card-spider-silhouette.png'))
  root.style.setProperty('--ta-url-grain', u('card-chitin-inner-grain.png'))
  root.style.setProperty('--ta-url-badge-level', u('badge-level-chitin.png'))
  root.style.setProperty('--ta-url-divider-v', u('card-divider-vertical.png'))
  root.style.setProperty('--ta-url-parchment', u('parchment-bg.png'))
}

initPublicAssets()
