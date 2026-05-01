import {
  buildEnglishBetaWelcomeEmail,
  buildSpanishBetaWelcomeEmail,
  DEFAULT_BETA_APP_URL,
} from './welcomeBetaEmail'

/**
 * @param {import('./betaEmailTemplatesStorage.js').BetaEmailTemplateRow | null | undefined} template
 * @param {{ name: string, email: string, password: string, appUrl?: string, sendDate?: string }} ctx
 */
export function applyBetaPlaceholders(text, ctx) {
  const vars = {
    name: ctx.name ?? '',
    email: ctx.email ?? '',
    password: ctx.password ?? '',
    appUrl: ctx.appUrl ?? DEFAULT_BETA_APP_URL,
    sendDate: ctx.sendDate ?? '',
  }
  let out = text == null ? '' : String(text)
  Object.entries(vars).forEach(([k, v]) => {
    const re = new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g')
    out = out.replace(re, v)
  })
  return out
}

/**
 * @param {import('./betaEmailTemplatesStorage.js').BetaEmailTemplateRow | null | undefined} template
 * @param {{ name: string, email: string, password: string, appUrl?: string, sendDate?: string }} ctx
 */
export function renderBetaEmailBody(template, ctx) {
  const base = {
    name: ctx.name || '',
    email: ctx.email || '',
    password: ctx.password || '',
    appUrl: ctx.appUrl || DEFAULT_BETA_APP_URL,
    sendDate:
      ctx.sendDate ||
      (template?.locale === 'en'
        ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date())
        : new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date())),
  }
  if (!template || template.kind === 'builtin') {
    const b = template?.builtin === 'welcomeEn' ? 'welcomeEn' : 'welcomeEs'
    if (b === 'welcomeEn') return buildEnglishBetaWelcomeEmail(base)
    return buildSpanishBetaWelcomeEmail(base)
  }
  return applyBetaPlaceholders(template.body || '', base)
}
