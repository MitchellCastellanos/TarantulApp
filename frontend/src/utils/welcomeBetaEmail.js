import { ANDROID_PLAY_INTERNAL_TEST_URL } from '../constants/playStoreUrls'

/** Canonical production URL (override via param when copying from staging). */
export const DEFAULT_BETA_APP_URL = 'https://tarantulapp.com'

/** Google Play internal-test URL for closed beta (same as in-app callout). */
export { ANDROID_PLAY_INTERNAL_TEST_URL }

/** WhatsApp community groups for beta testers. Keep in sync with backend `BetaMailBodies.java`. */
export const WHATSAPP_GROUP_URL_ES = 'https://chat.whatsapp.com/EpXkeCKZ6uh5qhqKT3d9w2?mode=gi_t'
export const WHATSAPP_GROUP_URL_EN = 'https://chat.whatsapp.com/CIdg6rBQPo6FXeLNhpZA6a?mode=gi_t'

/** Public asset for Word export and HTML signatures (`frontend/public`). */
export const BETA_EMAIL_SIGNATURE_IMAGE_PATH = '/email-signature-tarantulapp.png'

/**
 * Spanish welcome email for closed-beta batch (copy into Gmail).
 * @param {{ name: string, email: string, password: string, appUrl?: string, sendDate?: string }} p
 */
export function buildSpanishBetaWelcomeEmail(p) {
  const appUrl = p.appUrl || DEFAULT_BETA_APP_URL
  const sendDate = p.sendDate || new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date())
  const name = (p.name || '').trim() || 'criador'
  return [
    `Hola ${name},`,
    '',
    `Fecha del mensaje: ${sendDate}`,
    '',
    'Felicidades: has sido aceptado en la beta cerrada de TarantulApp. De todos los criadores que se postularon, eres uno de los pocos elegidos para ayudarnos a moldear la plataforma antes de su lanzamiento público.',
    '',
    'Importante para este batch:',
    `• Ya puedes instalar la app Android desde Google Play (lista de prueba interna). Enlace: ${ANDROID_PLAY_INTERNAL_TEST_URL}`,
    '• Abre ese enlace en el teléfono con la cuenta de Google que tenga acceso a la prueba; instala TarantulApp e inicia sesión con el mismo correo y contraseña que para la web.',
    '• La web app sigue disponible en cualquier navegador; el lunes recibirás por correo las misiones de la semana.',
    '',
    'Únete a nuestro grupo de WhatsApp para testers (español):',
    `• ${WHATSAPP_GROUP_URL_ES}`,
    '• Es el canal más rápido para preguntas, ideas y reportar bugs en caliente. Te recomendamos entrar el primer día.',
    '',
    'Cómo entrar (web):',
    `1) Abre ${appUrl} y usa el acceso beta ("Beta tester login" / acceso beta) en la pantalla pública.`,
    '2) Inicia sesión con el correo y la contraseña que aparecen abajo.',
    '',
    'Web app en el móvil (atajo):',
    '• iPhone/iPad: Safari → Compartir → "Añadir a pantalla de inicio".',
    '• Android (Chrome): menú ⋮ → "Instalar app" o "Añadir a la pantalla principal" si el navegador lo ofrece — o usa la app nativa desde Play arriba.',
    '',
    'Esto es lo que necesitas saber:',
    '',
    '1) Tu acceso',
    `   • Web: ${appUrl}`,
    `   • Android (Play — prueba interna): ${ANDROID_PLAY_INTERNAL_TEST_URL}`,
    `   • Email: ${p.email}`,
    `   • Contraseña: ${p.password}`,
    '',
    '   Tu cuenta está marcada como beta tester: verás las funciones beta y el botón "Reportar un bug".',
    '',
    '2) El plan (6 semanas)',
    '   • Semana 0 — Configura tu cuenta y mete tu colección.',
    '   • Semanas 1–2 — Día a día: comidas, mudas, fotos, recordatorios.',
    '   • Semanas 3–4 — Feed comunidad, perfil de criador, marketplace, chat.',
    '   • Semana 5 — Prueba Pro, etiquetas QR y detalles finos.',
    '   • Semana 6 — Encuesta final + tu testimonio.',
    '',
    '3) Cómo enviar feedback',
    '   • Bugs: toca "Reportar un bug" dentro de la app — adjunta página, dispositivo y versión.',
    '   • Ideas / preguntas: responde a este correo.',
    '   • Cada lunes te llegará un correo corto con la misión de la semana.',
    '',
    '4) Lo que te pedimos',
    '   • Usa la app al menos unos minutos, 3+ días a la semana.',
    '   • Envía al menos un feedback por semana (bug, idea o "todo bien").',
    '   • Sé honesto — preferimos un "esto confunde" antes que un silencio cortés.',
    '',
    'Gracias por confiarnos tu colección. Construyamos juntos la mejor app de tarántulas del mundo.',
    '',
    '— El equipo de TarantulApp',
    '',
  ].join('\n')
}

/**
 * English template for future batches (same structure).
 */
export function buildEnglishBetaWelcomeEmail(p) {
  const appUrl = p.appUrl || DEFAULT_BETA_APP_URL
  const sendDate =
    p.sendDate ||
    new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date())
  const name = (p.name || '').trim() || 'keeper'
  return [
    `Hi ${name},`,
    '',
    `Message date: ${sendDate}`,
    '',
    'Congratulations — you’ve been accepted into the TarantulApp closed beta. Among everyone who applied, you’re one of the few helping us shape the platform before public launch.',
    '',
    'Important for this batch:',
    `• Android is available on Google Play for testers (internal testing track). Link: ${ANDROID_PLAY_INTERNAL_TEST_URL}`,
    '• Open that link on your phone while signed into the Google account that has access to the test, install TarantulApp, then sign in with the same email and password as the web app.',
    '• The web app still works in any browser; on Monday you’ll get the week’s missions by email.',
    '',
    'Join our WhatsApp group for testers (English):',
    `• ${WHATSAPP_GROUP_URL_EN}`,
    '• It’s the fastest channel for questions, ideas, and live bug reports. We recommend joining on day one.',
    '',
    'How to sign in (web):',
    `1) Open ${appUrl} and use the beta gate ("Beta tester login") on the public home screen.`,
    '2) Sign in with the email and password below.',
    '',
    'Web app on your phone (shortcut):',
    '• iPhone/iPad: Safari → Share → “Add to Home Screen”.',
    '• Android (Chrome): Menu → “Install app” or “Add to Home screen” when offered — or use the native app from Play above.',
    '',
    'What you need to know:',
    '',
    '1) Your access',
    `   • Web: ${appUrl}`,
    `   • Android (Play — internal test): ${ANDROID_PLAY_INTERNAL_TEST_URL}`,
    `   • Email: ${p.email}`,
    `   • Password: ${p.password}`,
    '',
    '   Your account is flagged as a beta tester — you’ll see beta features and the “Report a bug” button.',
    '',
    '2) The 6-week plan',
    '   • Week 0 — Set up your account and import your collection.',
    '   • Weeks 1–2 — Day-to-day: feeds, molts, photos, reminders.',
    '   • Weeks 3–4 — Community feed, keeper profile, marketplace, chat.',
    '   • Week 5 — Pro trial, QR labels, polish.',
    '   • Week 6 — Final survey + your testimonial.',
    '',
    '3) How to send feedback',
    '   • Bugs: tap “Report a bug” in the app — it attaches page, device, and version.',
    '   • Ideas / questions: reply to this email.',
    '   • Each Monday you’ll get a short email with the weekly mission.',
    '',
    '4) What we ask',
    '   • Use the app a few minutes a day, 3+ days per week.',
    '   • Send at least one piece of feedback per week (bug, idea, or “all good”).',
    '   • Be honest — we prefer “this is confusing” over polite silence.',
    '',
    'Thanks for trusting us with your collection. Let’s build the best tarantula app together.',
    '',
    '— The TarantulApp team',
    '',
  ].join('\n')
}
