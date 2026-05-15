const STORAGE_KEY = 'tarantulapp_beta_email_templates_v1'

/**
 * @typedef {{ id: string, label: string, locale: 'es'|'en'|'fr', kind: 'builtin'|'custom', builtin?: 'welcomeEs'|'welcomeEn'|'welcomeFr', body?: string }} BetaEmailTemplateRow
 */

/** @returns {BetaEmailTemplateRow[]} */
export function defaultBetaEmailTemplates() {
  return [
    {
      id: 'builtin-welcome-es',
      label: 'Bienvenida (usuario acceso anticipado)',
      locale: 'es',
      kind: 'builtin',
      builtin: 'welcomeEs',
    },
    {
      id: 'builtin-welcome-en',
      label: 'Welcome (early access member)',
      locale: 'en',
      kind: 'builtin',
      builtin: 'welcomeEn',
    },
    {
      id: 'builtin-welcome-fr',
      label: 'Bienvenue (membre accès anticipé)',
      locale: 'fr',
      kind: 'builtin',
      builtin: 'welcomeFr',
    },
  ]
}

/** Append FR builtin if missing (older localStorage lists). */
function ensureBuiltinFrenchWelcome(templates) {
  const hasFr = templates.some((t) => t.builtin === 'welcomeFr' || t.locale === 'fr')
  if (hasFr) return templates
  const frTpl = defaultBetaEmailTemplates().find((d) => d.builtin === 'welcomeFr')
  return frTpl ? [...templates, frTpl] : templates
}

/** @returns {BetaEmailTemplateRow[]} */
export function loadBetaEmailTemplates() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return ensureBuiltinFrenchWelcome(normalizeTemplates(parsed))
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
      kind === 'builtin'
        ? r.builtin === 'welcomeEn'
          ? 'welcomeEn'
          : r.builtin === 'welcomeFr'
            ? 'welcomeFr'
            : 'welcomeEs'
        : undefined
    return {
      id: r.id || `tpl-${i}-${Date.now()}`,
      label: (r.label || 'Template').trim(),
      locale: r.locale === 'en' ? 'en' : r.locale === 'fr' ? 'fr' : 'es',
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
