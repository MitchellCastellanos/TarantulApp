import {
  ANDROID_PLAY_STORE_URL,
  ANDROID_PLAY_LEGACY_INTERNAL_TEST_URL,
} from '../constants/playStoreUrls.js'

/** Canonical production URL (override via param when copying from staging). */
export const DEFAULT_BETA_APP_URL = 'https://tarantulapp.com'

/** Google Play listing URL for closed-beta installs (same as in-app callout). */
export { ANDROID_PLAY_STORE_URL }

/** Legacy internal-test URL — only mentioned so people stop using it. */
export { ANDROID_PLAY_LEGACY_INTERNAL_TEST_URL }

/** Public asset for Word export and HTML signatures (`frontend/public`). */
export const BETA_EMAIL_SIGNATURE_IMAGE_PATH = '/email-signature-tarantulapp.png'

/**
 * Spanish welcome — registro listo, bienvenida como usuario, acceso e instrucciones.
 * @param {{ name: string, email: string, password: string, appUrl?: string, sendDate?: string }} p
 */
export function buildSpanishBetaWelcomeEmail(p) {
  const appUrl = p.appUrl || DEFAULT_BETA_APP_URL
  const sendDate = p.sendDate || new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date())
  const name = (p.name || '').trim() || 'criador'
  const play = ANDROID_PLAY_STORE_URL
  const legacy = ANDROID_PLAY_LEGACY_INTERNAL_TEST_URL
  return [
    `Hola ${name},`,
    '',
    `Fecha del mensaje: ${sendDate}`,
    '',
    'Tu registro de acceso anticipado en TarantulApp ya está listo. Te damos la bienvenida como usuario/a: con este mensaje confirmamos tu acceso y te recordamos cómo descargar la app o entrar en la web y comprobar que vas con el correo correcto.',
    '',
    'En Android la descarga hoy va por Google Play en lista de acceso anticipado; cuando pasemos al listado público, el flujo será como con cualquier otra app y tu cuenta se queda igual.',
    '',
    'Descargar la app (Android — Google Play)',
    '',
    `1) En tu teléfono Android, abre este enlace (mejor tocándolo desde el móvil): ${play}`,
    '2) Asegúrate de usar la cuenta de Google con la invitación de acceso anticipado en Play. Si Play dice que no tienes acceso, cambia de cuenta en el dispositivo o en la app de Play Store y vuelve a intentar.',
    '3) Pulsa Instalar o Actualizar, abre TarantulApp e inicia sesión con el correo y contraseña de “Tu acceso” abajo — los mismos que en la web.',
    '',
    `Si antes usabas el enlace de prueba interna (${legacy}), no lo uses: desinstala esa versión si hace falta y vuelve a instalar desde el enlace de la tienda de arriba.`,
    '',
    'Comprueba tu correo (importante)',
    '',
    `• TarantulApp: entra con exactamente ${p.email} y la contraseña de abajo. Si no entra, puede que no sea la cuenta que dimos de alta — prueba de nuevo o responde a este correo.`,
    '• Google: solo sirve para que Play te muestre la app con acceso anticipado; no es tu contraseña de TarantulApp.',
    '',
    'Entrar por la web (cualquier dispositivo)',
    '',
    `1) Abre ${appUrl} en el navegador.`,
    '2) En la pantalla de inicio, usa la opción de acceso para miembros con acceso anticipado (puede aparecer como “Beta tester login”).',
    '3) Inicia sesión con el mismo correo y contraseña que arriba.',
    '',
    'Atajo en el móvil',
    '',
    '• iPhone / iPad: Safari → Compartir → “Añadir a pantalla de inicio”.',
    '• Android (Chrome): menú ⋮ → “Instalar app” o “Añadir a la pantalla principal” si sale — o la app nativa desde Play arriba.',
    '',
    'Tu acceso',
    '',
    `   • Web: ${appUrl}`,
    `   • Android (Play — acceso anticipado): ${play}`,
    `   • Correo: ${p.email}`,
    `   • Contraseña: ${p.password}`,
    '',
    '   Si ves “Reportar un bug” u textos de acceso anticipado, es normal mientras afinamos la experiencia.',
    '',
    'Algunas cosas que puedes hacer en TarantulApp',
    '',
    '• Llevar tu colección: cada tarántula con fotos, notas y estado.',
    '• Registrar comidas, mudas y recordatorios del día a día.',
    '• Explorar la comunidad, tu perfil de criador y el marketplace cuando lo uses.',
    '',
    'Si algo no cuadra o necesitas ayuda, responde a este correo o usa “Reportar un bug” en la app (adjunta página, dispositivo y versión). ¡Gracias por estar con nosotros!',
    '',
    '— El equipo de TarantulApp',
    '',
  ].join('\n')
}

/**
 * English welcome — registration ready, welcome as a user, access + how to install/sign in.
 */
export function buildEnglishBetaWelcomeEmail(p) {
  const appUrl = p.appUrl || DEFAULT_BETA_APP_URL
  const sendDate =
    p.sendDate || new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' }).format(new Date())
  const name = (p.name || '').trim() || 'keeper'
  const play = ANDROID_PLAY_STORE_URL
  const legacy = ANDROID_PLAY_LEGACY_INTERNAL_TEST_URL
  return [
    `Hi ${name},`,
    '',
    `Message date: ${sendDate}`,
    '',
    'Your TarantulApp early access registration is ready. Welcome — this email confirms your access and walks you through downloading the app (Android), signing in on the web, and making sure you’re on the correct email address.',
    '',
    'On Android, installs still use Google Play’s early-access listing for now; when we move to the public store listing, updates work like any other app and your account stays the same.',
    '',
    'Download the app (Android — Google Play)',
    '',
    `1) On your Android phone, open this link (tap it from the phone): ${play}`,
    '2) Make sure you’re signed into the Google account that has the Play early-access invite. If Play says you don’t have access, switch Google accounts on the device or in the Play Store app and try again.',
    '3) Tap Install or Update, open TarantulApp, then sign in with the email and password under “Your login” below — the same as the website.',
    '',
    `If you previously used the internal-testing install URL (${legacy}), don’t use it anymore — uninstall that build if needed and reinstall from the Store link above.`,
    '',
    'Double-check your email (important)',
    '',
    `• TarantulApp: sign in with exactly ${p.email} and the password below. If login fails, you may be on a different account than the one we set up — try again or reply to this email.`,
    '• Google: only affects whether Play shows you the early-access listing; it is not your TarantulApp password.',
    '',
    'Sign in on the web (any device)',
    '',
    `1) Open ${appUrl} in your browser.`,
    '2) On the public home screen, use the sign-in option for early access members (it may read “Beta tester login”).',
    '3) Sign in with the same email and password as above.',
    '',
    'Shortcut on your phone',
    '',
    '• iPhone / iPad: Safari → Share → “Add to Home Screen”.',
    '• Android (Chrome): Menu → “Install app” or “Add to Home screen” when offered — or use the native Play Store app from the link above.',
    '',
    'Your login',
    '',
    `   • Web: ${appUrl}`,
    `   • Android (Play — early access): ${play}`,
    `   • Email: ${p.email}`,
    `   • Password: ${p.password}`,
    '',
    '   If you see “Report a bug” or early-access wording, that’s normal while we polish the experience.',
    '',
    'A few things you can do in TarantulApp',
    '',
    '• Build and browse your collection — each spider with photos, notes, and status.',
    '• Log feedings and molts, set reminders for day-to-day care.',
    '• Explore the community feed, your keeper profile, and marketplace when you use it.',
    '',
    'If anything looks off or you need a hand, reply to this email or use “Report a bug” in the app (it attaches page, device, and version). Thanks for being with us!',
    '',
    '— The TarantulApp team',
    '',
  ].join('\n')
}

/**
 * French welcome — inscription prête, accès confirmé, téléchargement / connexion.
 */
export function buildFrenchBetaWelcomeEmail(p) {
  const appUrl = p.appUrl || DEFAULT_BETA_APP_URL
  const sendDate =
    p.sendDate || new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date())
  const name = (p.name || '').trim() || 'éleveur'
  const play = ANDROID_PLAY_STORE_URL
  const legacy = ANDROID_PLAY_LEGACY_INTERNAL_TEST_URL
  return [
    `Bonjour ${name},`,
    '',
    `Date du message : ${sendDate}`,
    '',
    'Votre inscription à l’accès anticipé TarantulApp est prête. Bienvenue : ce message confirme votre accès et rappelle comment télécharger l’app (Android), vous connecter sur le web, et vérifier que vous utilisez la bonne adresse e-mail.',
    '',
    'Sur Android, l’installation passe encore par une fiche Play en accès anticipé ; lorsque nous ouvrirons au grand public, les mises à jour seront comme pour n’importe quelle app et votre compte reste le même.',
    '',
    'Télécharger l’app (Android — Google Play)',
    '',
    `1) Sur votre téléphone Android, ouvrez ce lien (idéalement en le touchant depuis le téléphone) : ${play}`,
    '2) Vérifiez que vous êtes sur le compte Google invité à l’accès anticipé sur le Play Store. Si l’accès est refusé, changez de compte sur l’appareil ou dans l’app Play Store, puis réessayez.',
    '3) Appuyez sur Installer ou Mettre à jour, ouvrez TarantulApp, puis connectez-vous avec l’e-mail et le mot de passe de « Vos identifiants » ci-dessous — les mêmes que sur le site web.',
    '',
    `Si vous aviez installé via l’ancien lien de test interne (${legacy}), ne l’utilisez plus — désinstallez cette version si besoin et réinstallez depuis le lien Play ci-dessus.`,
    '',
    'Vérifier votre e-mail (important)',
    '',
    `• TarantulApp : connectez-vous avec exactement ${p.email} et le mot de passe ci-dessous. Si la connexion échoue, vous n’êtes peut‑être pas sur le bon compte — réessayez ou répondez à cet e-mail.`,
    '• Google : sert seulement à afficher l’app en accès anticipé sur le Play Store ; ce n’est pas votre mot de passe TarantulApp.',
    '',
    'Connexion web (n’importe quel appareil)',
    '',
    `1) Ouvrez ${appUrl} dans le navigateur.`,
    '2) Sur l’accueil public, utilisez l’option de connexion pour les membres en accès anticipé (l’intitulé peut être « Beta tester login »).',
    '3) Connectez-vous avec le même e-mail et mot de passe qu’au-dessus.',
    '',
    'Raccourci sur le téléphone',
    '',
    '• iPhone / iPad : Safari → Partager → « Sur l’écran d’accueil ».',
    '• Android (Chrome) : Menu → « Installer l’application » ou « Ajouter à l’écran d’accueil » si proposé — ou l’app native Play via le lien ci-dessus.',
    '',
    'Vos identifiants',
    '',
    `   • Web : ${appUrl}`,
    `   • Android (Play — accès anticipé) : ${play}`,
    `   • E-mail : ${p.email}`,
    `   • Mot de passe : ${p.password}`,
    '',
    '   Si vous voyez « Report a bug » ou des mentions d’accès anticipé, c’est normal pendant que nous peaufinons l’expérience.',
    '',
    'Quelques possibilités dans TarantulApp',
    '',
    '• Gérer votre collection — chaque araignée avec photos, notes et état.',
    '• Enregistrer nourrissures et mues, créer des rappels pour le quotidien.',
    '• Explorer le fil communautaire, votre profil d’éleveur et le marketplace si vous l’utilisez.',
    '',
    'Pour toute question ou si quelque chose cloche, répondez à cet e-mail ou utilisez « Report a bug » dans l’app (contexte, appareil, version). Merci de faire partie de l’aventure !',
    '',
    '— L’équipe TarantulApp',
    '',
  ].join('\n')
}
