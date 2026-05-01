const STORAGE_KEY = 'tarantulapp_beta_email_templates_v1'

/**
 * @typedef {{ id: string, label: string, locale: 'es'|'en', kind: 'builtin'|'custom', builtin?: 'welcomeEs'|'welcomeEn', body?: string }} BetaEmailTemplateRow
 */

/** @returns {BetaEmailTemplateRow[]} */
export function defaultBetaEmailTemplates() {
  return [
    {
      id: 'builtin-welcome-es',
      label: 'Bienvenida (lote 1)',
      locale: 'es',
      kind: 'builtin',
      builtin: 'welcomeEs',
    },
    {
      id: 'builtin-welcome-en',
      label: 'Welcome (batch 1)',
      locale: 'en',
      kind: 'builtin',
      builtin: 'welcomeEn',
    },
  ]
}

/** @returns {BetaEmailTemplateRow[]} */
export function loadBetaEmailTemplates() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return normalizeTemplates(parsed)
    }
  } catch {
    /* ignore */
  }
  return defaultBetaEmailTemplates()
}

/** @param {BetaEmailTemplateRow[]} templates */
export function saveBetaEmailTemplates(templates) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeTemplates(templates)))
}

export function resetBetaEmailTemplatesToDefaults() {
  localStorage.removeItem(STORAGE_KEY)
}

/** @param {Partial<BetaEmailTemplateRow>[]} rows */
function normalizeTemplates(rows) {
  return rows.map((r, i) => {
    const kind = r.kind === 'custom' ? 'custom' : 'builtin'
    const builtin =
      kind === 'builtin' ? (r.builtin === 'welcomeEn' ? 'welcomeEn' : 'welcomeEs') : undefined
    return {
      id: r.id || `tpl-${i}-${Date.now()}`,
      label: (r.label || 'Template').trim(),
      locale: r.locale === 'en' ? 'en' : 'es',
      kind,
      builtin,
      body: typeof r.body === 'string' ? r.body : '',
    }
  })
}

export function newCustomTemplateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return `custom-${crypto.randomUUID()}`
  return `custom-${Date.now()}`
}
