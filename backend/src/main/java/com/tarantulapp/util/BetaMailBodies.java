package com.tarantulapp.util;

import java.util.Locale;
import java.util.Set;

/**
 * Plain-text bodies for beta welcome + optional batch campaign emails (including creator-partner
 * follow-ups). Keep in sync with {@code frontend/src/utils/welcomeBetaEmail.js} for the welcome copy.
 * {@code fr} locale: welcome email is localized; batch campaign bodies/subjects use English until localized.
 */
public final class BetaMailBodies {

    public static final String DEFAULT_APP_URL = "https://tarantulapp.com";

    /**
     * Public Play Store listing (closed testing). Keep in sync with {@code frontend/src/constants/playStoreUrls.js}.
     */
    public static final String ANDROID_PLAY_STORE_URL =
            "https://play.google.com/store/apps/details?id=com.tarantulapp.app";

    /** Old internal-testing URL — only referenced when telling testers to stop using it. */
    public static final String ANDROID_PLAY_LEGACY_INTERNAL_TEST_URL =
            "https://play.google.com/apps/internaltest/4700991665399344151";

    public static final Set<String> BATCH_CAMPAIGN_KEYS = Set.of(
            "week_1",
            "week_2",
            "week_3",
            "week_4",
            "week_5",
            "week_6",
            "android_play_beta",
            "play_early_access_web",
            "creator_partner_onboarding",
            "creator_partner_reminder",
            "vendor_welcome_mx"
    );

    /** Campaign keys that may target any registered user (no beta-tester gating). */
    private static final Set<String> NON_BETA_RECIPIENT_KEYS = Set.of(
            "play_early_access_web",
            "vendor_welcome_mx"
    );

    private BetaMailBodies() {
    }

    public static boolean isBatchCampaignKey(String key) {
        return key != null && BATCH_CAMPAIGN_KEYS.contains(key.trim().toLowerCase(Locale.ROOT));
    }

    /** Batch key that may be sent to any registered user (e.g. already on web, not yet on Play). */
    public static boolean allowsNonBetaRecipients(String campaignKey) {
        return campaignKey != null && NON_BETA_RECIPIENT_KEYS.contains(campaignKey.trim().toLowerCase(Locale.ROOT));
    }

    public static String welcomeSubject(String locale) {
        String loc = normalizeLocale(locale);
        if ("en".equals(loc)) {
            return "TarantulApp — Welcome (early access)";
        }
        if ("fr".equals(loc)) {
            return "TarantulApp — Bienvenue (accès anticipé)";
        }
        return "TarantulApp — Bienvenida (acceso anticipado)";
    }

    public static String campaignSubject(String campaignKey, String locale) {
        String k = campaignKey == null ? "" : campaignKey.trim().toLowerCase(Locale.ROOT);
        String loc = normalizeLocale(locale);
        boolean en = "en".equals(loc) || "fr".equals(loc); // FR: English subjects until localized
        return switch (k) {
            case "week_1" -> en
                    ? "TarantulApp beta — Week 1 mission"
                    : "TarantulApp beta — Misión semana 1";
            case "week_2" -> en
                    ? "TarantulApp beta — Week 2 mission"
                    : "TarantulApp beta — Misión semana 2";
            case "week_3" -> en
                    ? "TarantulApp beta — Week 3 mission"
                    : "TarantulApp beta — Misión semana 3";
            case "week_4" -> en
                    ? "TarantulApp beta — Week 4 mission"
                    : "TarantulApp beta — Misión semana 4";
            case "week_5" -> en
                    ? "TarantulApp beta — Week 5 mission"
                    : "TarantulApp beta — Misión semana 5";
            case "week_6" -> en
                    ? "TarantulApp beta — Week 6 — final check-in"
                    : "TarantulApp beta — Semana 6 — cierre";
            case "android_play_beta" -> en
                    ? "TarantulApp beta — Android on Google Play (closed testing)"
                    : "Beta TarantulApp — Android ya en Google Play (prueba cerrada)";
            case "play_early_access_web" -> switch (loc) {
                case "en" -> "TarantulApp — Download the Android app (Play early access)";
                case "fr" -> "TarantulApp — Téléchargez l'app Android (Play, accès anticipé)";
                default -> "TarantulApp — Ya puedes instalar la app Android (acceso anticipado Play)";
            };
            case "creator_partner_onboarding" -> en
                    ? "TarantulApp — Creator partner: your content brief & perks"
                    : "TarantulApp — Alianza creadores: brief y beneficios";
            case "creator_partner_reminder" -> en
                    ? "TarantulApp — Quick nudge: still up for a short video?"
                    : "TarantulApp — ¿Seguimos con el video corto?";
            case "vendor_welcome_mx" -> switch (loc) {
                case "en" -> "TarantulApp Marketplace — Your vendor storefront is live (Mexico)";
                case "fr" -> "TarantulApp Marketplace — Votre boutique vendeur est active (Mexique)";
                default -> "TarantulApp Marketplace — Tu tienda vendor ya está activa (México)";
            };
            default -> en ? "TarantulApp beta — Update" : "TarantulApp beta — Actualización";
        };
    }

    public static String normalizeLocale(String locale) {
        if (locale == null || locale.isBlank()) {
            return "es";
        }
        String t = locale.trim().toLowerCase(Locale.ROOT);
        if (t.startsWith("en")) {
            return "en";
        }
        if (t.startsWith("fr")) {
            return "fr";
        }
        return "es";
    }

    public static String welcomeEs(String name, String email, String password, String appUrl, String sendDate) {
        String n = (name == null || name.isBlank()) ? "criador" : name.trim();
        String url = (appUrl == null || appUrl.isBlank()) ? DEFAULT_APP_URL : appUrl.trim();
        String e = email == null ? "" : email.trim();
        String p = password == null ? "" : password;
        String play = ANDROID_PLAY_STORE_URL;
        String legacy = ANDROID_PLAY_LEGACY_INTERNAL_TEST_URL;
        return "Hola " + n + ",\n"
                + "\n"
                + "Fecha del mensaje: " + sendDate + "\n"
                + "\n"
                + "Tu registro de acceso anticipado en TarantulApp ya está listo. Te damos la bienvenida como usuario/a: con este mensaje "
                + "confirmamos tu acceso y te recordamos cómo descargar la app o entrar en la web y comprobar que vas con el correo correcto.\n"
                + "\n"
                + "En Android la descarga hoy va por Google Play en lista de acceso anticipado; cuando pasemos al listado público, el "
                + "flujo será como con cualquier otra app y tu cuenta se queda igual.\n"
                + "\n"
                + "Descargar la app (Android — Google Play)\n"
                + "\n"
                + "1) En tu teléfono Android, abre este enlace (mejor tocándolo desde el móvil): " + play + "\n"
                + "2) Asegúrate de usar la cuenta de Google con la invitación de acceso anticipado en Play. Si Play dice que no tienes "
                + "acceso, cambia de cuenta en el dispositivo o en la app de Play Store y vuelve a intentar.\n"
                + "3) Pulsa Instalar o Actualizar, abre TarantulApp e inicia sesión con el correo y contraseña de \"Tu acceso\" abajo — "
                + "los mismos que en la web.\n"
                + "\n"
                + "Si antes usabas el enlace de prueba interna (" + legacy + "), no lo uses: desinstala esa versión si hace falta y "
                + "vuelve a instalar desde el enlace de la tienda de arriba.\n"
                + "\n"
                + "Comprueba tu correo (importante)\n"
                + "\n"
                + "• TarantulApp: entra con exactamente " + e + " y la contraseña de abajo. Si no entra, puede que no sea la cuenta que "
                + "dimos de alta — prueba de nuevo o responde a este correo.\n"
                + "• Google: solo sirve para que Play te muestre la app con acceso anticipado; no es tu contraseña de TarantulApp.\n"
                + "\n"
                + "Entrar por la web (cualquier dispositivo)\n"
                + "\n"
                + "1) Abre " + url + " en el navegador.\n"
                + "2) En la pantalla de inicio, usa la opción de acceso para miembros con acceso anticipado (puede aparecer como "
                + "\"Beta tester login\").\n"
                + "3) Inicia sesión con el mismo correo y contraseña que arriba.\n"
                + "\n"
                + "Atajo en el móvil\n"
                + "\n"
                + "• iPhone / iPad: Safari → Compartir → \"Añadir a pantalla de inicio\".\n"
                + "• Android (Chrome): menú → \"Instalar app\" o \"Añadir a la pantalla principal\" si sale — o la app nativa desde Play "
                + "arriba.\n"
                + "\n"
                + "Tu acceso\n"
                + "\n"
                + "   • Web: " + url + "\n"
                + "   • Android (Play — acceso anticipado): " + play + "\n"
                + "   • Correo: " + e + "\n"
                + "   • Contraseña: " + p + "\n"
                + "\n"
                + "   Si ves \"Reportar un bug\" u textos de acceso anticipado, es normal mientras afinamos la experiencia.\n"
                + "\n"
                + "Algunas cosas que puedes hacer en TarantulApp\n"
                + "\n"
                + "• Llevar tu colección: cada tarántula con fotos, notas y estado.\n"
                + "• Registrar comidas, mudas y recordatorios del día a día.\n"
                + "• Explorar la comunidad, tu perfil de criador y el marketplace cuando lo uses.\n"
                + "\n"
                + "Si algo no cuadra o necesitas ayuda, responde a este correo o usa \"Reportar un bug\" en la app (adjunta página, "
                + "dispositivo y versión). ¡Gracias por estar con nosotros!\n"
                + "\n"
                + "— El equipo de TarantulApp\n";
    }

    public static String welcomeEn(String name, String email, String password, String appUrl, String sendDate) {
        String n = (name == null || name.isBlank()) ? "keeper" : name.trim();
        String url = (appUrl == null || appUrl.isBlank()) ? DEFAULT_APP_URL : appUrl.trim();
        String e = email == null ? "" : email.trim();
        String p = password == null ? "" : password;
        String play = ANDROID_PLAY_STORE_URL;
        String legacy = ANDROID_PLAY_LEGACY_INTERNAL_TEST_URL;
        return "Hi " + n + ",\n"
                + "\n"
                + "Message date: " + sendDate + "\n"
                + "\n"
                + "Your TarantulApp early access registration is ready. Welcome — this email confirms your access and walks you through "
                + "downloading the app (Android), signing in on the web, and making sure you're on the correct email address.\n"
                + "\n"
                + "On Android, installs still use Google Play's early-access listing for now; when we move to the public store listing, "
                + "updates work like any other app and your account stays the same.\n"
                + "\n"
                + "Download the app (Android — Google Play)\n"
                + "\n"
                + "1) On your Android phone, open this link (tap it from the phone): " + play + "\n"
                + "2) Make sure you're signed into the Google account that has the Play early-access invite. If Play says you don't have "
                + "access, switch Google accounts on the device or in the Play Store app and try again.\n"
                + "3) Tap Install or Update, open TarantulApp, then sign in with the email and password under \"Your login\" below — "
                + "the same as the website.\n"
                + "\n"
                + "If you previously used the internal-testing install URL (" + legacy + "), don't use it anymore — uninstall that "
                + "build if needed and reinstall from the Store link above.\n"
                + "\n"
                + "Double-check your email (important)\n"
                + "\n"
                + "• TarantulApp: sign in with exactly " + e + " and the password below. If login fails, you may be on a different account "
                + "than the one we set up — try again or reply to this email.\n"
                + "• Google: only affects whether Play shows you the early-access listing; it is not your TarantulApp password.\n"
                + "\n"
                + "Sign in on the web (any device)\n"
                + "\n"
                + "1) Open " + url + " in your browser.\n"
                + "2) On the public home screen, use the sign-in option for early access members (it may read \"Beta tester login\").\n"
                + "3) Sign in with the same email and password as above.\n"
                + "\n"
                + "Shortcut on your phone\n"
                + "\n"
                + "• iPhone / iPad: Safari -> Share -> \"Add to Home Screen\".\n"
                + "• Android (Chrome): Menu -> \"Install app\" or \"Add to Home screen\" when offered — or use the native Play Store app "
                + "from the link above.\n"
                + "\n"
                + "Your login\n"
                + "\n"
                + "   • Web: " + url + "\n"
                + "   • Android (Play — early access): " + play + "\n"
                + "   • Email: " + e + "\n"
                + "   • Password: " + p + "\n"
                + "\n"
                + "   If you see \"Report a bug\" or early-access wording, that's normal while we polish the experience.\n"
                + "\n"
                + "A few things you can do in TarantulApp\n"
                + "\n"
                + "• Build and browse your collection — each spider with photos, notes, and status.\n"
                + "• Log feedings and molts, set reminders for day-to-day care.\n"
                + "• Explore the community feed, your keeper profile, and marketplace when you use it.\n"
                + "\n"
                + "If anything looks off or you need a hand, reply to this email or use \"Report a bug\" in the app (it attaches page, "
                + "device, and version). Thanks for being with us!\n"
                + "\n"
                + "— The TarantulApp team\n";
    }

    public static String welcomeFr(String name, String email, String password, String appUrl, String sendDate) {
        String n = (name == null || name.isBlank()) ? "éleveur" : name.trim();
        String url = (appUrl == null || appUrl.isBlank()) ? DEFAULT_APP_URL : appUrl.trim();
        String e = email == null ? "" : email.trim();
        String p = password == null ? "" : password;
        String play = ANDROID_PLAY_STORE_URL;
        String legacy = ANDROID_PLAY_LEGACY_INTERNAL_TEST_URL;
        return "Bonjour " + n + ",\n"
                + "\n"
                + "Date du message : " + sendDate + "\n"
                + "\n"
                + "Votre inscription à l'accès anticipé TarantulApp est prête. Bienvenue : ce message confirme votre accès et rappelle "
                + "comment télécharger l'app (Android), vous connecter sur le web, et vérifier que vous utilisez la bonne adresse e-mail.\n"
                + "\n"
                + "Sur Android, l'installation passe encore par une fiche Play en accès anticipé ; lorsque nous ouvrirons au grand public, "
                + "les mises à jour seront comme pour n'importe quelle app et votre compte reste le même.\n"
                + "\n"
                + "Télécharger l'app (Android — Google Play)\n"
                + "\n"
                + "1) Sur votre téléphone Android, ouvrez ce lien (idéalement en le touchant depuis le téléphone) : " + play + "\n"
                + "2) Vérifiez que vous êtes sur le compte Google invité à l'accès anticipé sur le Play Store. Si l'accès est refusé, "
                + "changez de compte sur l'appareil ou dans l'app Play Store, puis réessayez.\n"
                + "3) Appuyez sur Installer ou Mettre à jour, ouvrez TarantulApp, puis connectez-vous avec l'e-mail et le mot de passe de "
                + "\"Vos identifiants\" ci-dessous — les mêmes que sur le site web.\n"
                + "\n"
                + "Si vous aviez installé via l'ancien lien de test interne (" + legacy + "), ne l'utilisez plus — désinstallez cette "
                + "version si besoin et réinstallez depuis le lien Play ci-dessus.\n"
                + "\n"
                + "Vérifier votre e-mail (important)\n"
                + "\n"
                + "• TarantulApp : connectez-vous avec exactement " + e + " et le mot de passe ci-dessous. Si la connexion échoue, vous "
                + "n'êtes peut-être pas sur le bon compte — réessayez ou répondez à cet e-mail.\n"
                + "• Google : sert seulement à afficher l'app en accès anticipé sur le Play Store ; ce n'est pas votre mot de passe "
                + "TarantulApp.\n"
                + "\n"
                + "Connexion web (n'importe quel appareil)\n"
                + "\n"
                + "1) Ouvrez " + url + " dans le navigateur.\n"
                + "2) Sur l'accueil public, utilisez l'option de connexion pour les membres en accès anticipé (l'intitulé peut être "
                + "\"Beta tester login\").\n"
                + "3) Connectez-vous avec le même e-mail et mot de passe qu'au-dessus.\n"
                + "\n"
                + "Raccourci sur le téléphone\n"
                + "\n"
                + "• iPhone / iPad : Safari -> Partager -> « Sur l'écran d'accueil ».\n"
                + "• Android (Chrome) : Menu -> « Installer l'application » ou « Ajouter à l'écran d'accueil » si proposé — ou l'app "
                + "native Play via le lien ci-dessus.\n"
                + "\n"
                + "Vos identifiants\n"
                + "\n"
                + "   • Web : " + url + "\n"
                + "   • Android (Play — accès anticipé) : " + play + "\n"
                + "   • E-mail : " + e + "\n"
                + "   • Mot de passe : " + p + "\n"
                + "\n"
                + "   Si vous voyez « Report a bug » ou des mentions d'accès anticipé, c'est normal pendant que nous peaufinons "
                + "l'expérience.\n"
                + "\n"
                + "Quelques possibilités dans TarantulApp\n"
                + "\n"
                + "• Gérer votre collection — chaque araignée avec photos, notes et état.\n"
                + "• Enregistrer nourrissures et mues, créer des rappels pour le quotidien.\n"
                + "• Explorer le fil communautaire, votre profil d'éleveur et le marketplace si vous l'utilisez.\n"
                + "\n"
                + "Pour toute question ou si quelque chose cloche, répondez à cet e-mail ou utilisez « Report a bug » dans l'app (contexte, "
                + "appareil, version). Merci de faire partie de l'aventure !\n"
                + "\n"
                + "— L'équipe TarantulApp\n";
    }

    public static String campaignBody(String campaignKey, String locale, String name, String appUrl, String sendDate) {
        String loc = normalizeLocale(locale);
        String k = campaignKey == null ? "" : campaignKey.trim().toLowerCase(Locale.ROOT);
        if ("play_early_access_web".equals(k)) {
            String n = (name == null || name.isBlank())
                    ? ("en".equals(loc) ? "keeper" : "fr".equals(loc) ? "éleveur" : "criador")
                    : name.trim();
            String url = (appUrl == null || appUrl.isBlank()) ? DEFAULT_APP_URL : appUrl.trim();
            return switch (loc) {
                case "en" -> playEarlyAccessWebEn(n, url, sendDate);
                case "fr" -> playEarlyAccessWebFr(n, url, sendDate);
                default -> playEarlyAccessWebEs(n, url, sendDate);
            };
        }
        if ("vendor_welcome_mx".equals(k)) {
            String n = (name == null || name.isBlank())
                    ? ("en".equals(loc) ? "vendor" : "fr".equals(loc) ? "vendeur" : "tienda")
                    : name.trim();
            String url = (appUrl == null || appUrl.isBlank()) ? DEFAULT_APP_URL : appUrl.trim();
            return switch (loc) {
                case "en" -> vendorWelcomeMxEn(n, url, sendDate);
                case "fr" -> vendorWelcomeMxFr(n, url, sendDate);
                default -> vendorWelcomeMxEs(n, url, sendDate);
            };
        }
        String n = (name == null || name.isBlank())
                ? (("en".equals(loc) || "fr".equals(loc)) ? "keeper" : "criador")
                : name.trim();
        String url = (appUrl == null || appUrl.isBlank()) ? DEFAULT_APP_URL : appUrl.trim();
        if ("en".equals(loc) || "fr".equals(loc)) {
            return campaignBodyEn(k, n, url, sendDate);
        }
        return campaignBodyEs(k, n, url, sendDate);
    }

    private static String campaignBodyEs(String k, String n, String url, String sendDate) {
        return switch (k) {
            case "week_1" -> week1Es(n, url, sendDate);
            case "week_2" -> week2Es(n, url, sendDate);
            case "week_3" -> week3Es(n, url, sendDate);
            case "week_4" -> week4Es(n, url, sendDate);
            case "week_5" -> week5Es(n, url, sendDate);
            case "week_6" -> week6Es(n, url, sendDate);
            case "android_play_beta" -> androidPlayBetaAnnouncementEs(n, url, sendDate);
            case "creator_partner_onboarding" -> creatorPartnerOnboardingEs(n, url, sendDate);
            case "creator_partner_reminder" -> creatorPartnerReminderEs(n, url, sendDate);
            default -> weekGenericEs(n, url, sendDate);
        };
    }

    private static String campaignBodyEn(String k, String n, String url, String sendDate) {
        return switch (k) {
            case "week_1" -> week1En(n, url, sendDate);
            case "week_2" -> week2En(n, url, sendDate);
            case "week_3" -> week3En(n, url, sendDate);
            case "week_4" -> week4En(n, url, sendDate);
            case "week_5" -> week5En(n, url, sendDate);
            case "week_6" -> week6En(n, url, sendDate);
            case "android_play_beta" -> androidPlayBetaAnnouncementEn(n, url, sendDate);
            case "creator_partner_onboarding" -> creatorPartnerOnboardingEn(n, url, sendDate);
            case "creator_partner_reminder" -> creatorPartnerReminderEn(n, url, sendDate);
            default -> weekGenericEn(n, url, sendDate);
        };
    }

    /**
     * Send after welcome email: creator deliverables, tags, Pro / visibility — LatAm-focused tone.
     * Recipients must already be beta testers (same as other batch campaigns).
     */
    private static String creatorPartnerOnboardingEs(String n, String url, String sendDate) {
        String play = ANDROID_PLAY_STORE_URL;
        return "Hola " + n + ",\n\n"
                + "Fecha del mensaje: " + sendDate + "\n\n"
                + "Gracias por sumarte como aliado de contenido para TarantulApp. Este correo es el \"brief\" "
                + "rápido: qué buscamos, qué te ofrecemos y por dónde empezar.\n\n"
                + "Sobre el proyecto\n"
                + "TarantulApp es la app para criadores: colección, mudas, recordatorios, comunidad y "
                + "marketplace — pensada para que mostrar tus arañas y tu día a día sea más claro y útil "
                + "para la comunidad latina y de EE. UU. que ya está probando la beta.\n\n"
                + "Acceso\n"
                + "• Web: " + url + "\n"
                + "• Android (Play — prueba cerrada): " + play + "\n"
                + "• Misma cuenta en todos lados. Si algo no te deja entrar, responde a este correo.\n\n"
                + "Qué te pedimos (ajustable contigo)\n"
                + "• 1 video corto (60–120 s) o reel mostrando la app en tu rutina real: feed, recordatorio o "
                + "cómo registras una muda — sin guión perfecto, con honestidad.\n"
                + "• Mención visible de TarantulApp y, si puedes, etiqueta @tarantulapp (o la red que uses).\n"
                + "• Un comentario de feedback (bug, idea o \"todo bien\") para seguir mejorando.\n\n"
                + "Qué te ofrecemos durante la beta\n"
                + "• Pro sin costo mientras dure tu participación en el programa de creadores (beta).\n"
                + "• Menciones y espacio en highlights / canales del equipo cuando el contenido encaje.\n"
                + "• Badge de socio de contenido en perfil cuando la función esté disponible (te avisamos).\n"
                + "• Canal directo con el equipo para ideas y priorización.\n\n"
                + "Para coordinar o cualquier duda, responde a este correo.\n\n"
                + "Si prefieres otro formato (carrusel, TikTok, etc.) dímelo y lo alineamos. "
                + "¡Gracias por ayudarnos a que más criadores descubran una forma nueva de compartir su hobby.\n\n"
                + "— El equipo de TarantulApp\n";
    }

    private static String creatorPartnerOnboardingEn(String n, String url, String sendDate) {
        String play = ANDROID_PLAY_STORE_URL;
        return "Hi " + n + ",\n\n"
                + "Message date: " + sendDate + "\n\n"
                + "Thanks for joining as a TarantulApp content partner. This is the short brief: what we’re looking for, "
                + "what we offer, and where to start.\n\n"
                + "About the product\n"
                + "TarantulApp is the keeper-first app: collection, molts, reminders, community, and marketplace — "
                + "built so sharing your spiders and daily routine is clearer for hobbyists in LatAm and the US "
                + "who are already on the closed beta.\n\n"
                + "Access\n"
                + "• Web: " + url + "\n"
                + "• Android (Play — closed testing): " + play + "\n"
                + "• Same account everywhere. If login fails, reply to this email.\n\n"
                + "What we ask (we can adapt with you)\n"
                + "• One short video (60–120s) or reel using the app in your real workflow — feeding log, reminder, "
                + "molt entry; honest, not scripted.\n"
                + "• A clear mention of TarantulApp and tag @tarantulapp where your platform allows.\n"
                + "• One line of feedback (bug, idea, or “all good”) so we can improve.\n\n"
                + "What we offer during beta\n"
                + "• Complimentary Pro for the duration of your participation in the creator cohort.\n"
                + "• Shout-outs / highlights on our channels when the content fits.\n"
                + "• A “content partner” badge on profile once the feature ships (we’ll tell you).\n"
                + "• Direct line to the team for ideas and prioritization.\n\n"
                + "Reply to this email to coordinate or ask anything.\n\n"
                + "If you’d rather do a carousel, TikTok, etc., reply and we’ll align. "
                + "Thank you for helping more keepers discover a better way to share the hobby.\n\n"
                + "— The TarantulApp team\n";
    }

    /** Gentle nudge ~1–2 weeks after onboarding if no deliverable yet. */
    private static String creatorPartnerReminderEs(String n, String url, String sendDate) {
        return "Hola " + n + ",\n\n"
                + "Fecha del mensaje: " + sendDate + "\n\n"
                + "Te escribo por si se te fue el tiempo: ¿sigues con ganas de grabar el video corto con TarantulApp? "
                + "No pasa nada si se retrasa — si prefieres otro formato (reel, carrusel, historia) dímelo y lo ajustamos.\n\n"
                + "App: " + url + "\n\n"
                + "Si ya no te interesa o no alcanzas este mes, con un \"no por ahora\" nos ayudas a cerrar la lista "
                + "sin quedarte en el limbo.\n\n"
                + "Gracias,\n\n"
                + "— El equipo de TarantulApp\n";
    }

    private static String creatorPartnerReminderEn(String n, String url, String sendDate) {
        return "Hi " + n + ",\n\n"
                + "Message date: " + sendDate + "\n\n"
                + "Checking in: are you still up for the short TarantulApp video? Totally fine if life got busy — "
                + "if a carousel, TikTok, or Story works better, reply and we’ll align.\n\n"
                + "App: " + url + "\n\n"
                + "If it’s a “not right now,” that helps us plan — no pressure either way.\n\n"
                + "Thanks,\n\n"
                + "— The TarantulApp team\n";
    }

    private static String androidPlayBetaAnnouncementEs(String n, String url, String sendDate) {
        String play = ANDROID_PLAY_STORE_URL;
        String legacy = ANDROID_PLAY_LEGACY_INTERNAL_TEST_URL;
        return "Hola " + n + ",\n\n"
                + "Fecha del mensaje: " + sendDate + "\n\n"
                + "¡Gran noticia! Hemos pasado la app Android de la lista de prueba interna a la prueba cerrada en Google Play. "
                + "A partir de ahora usa solo el enlace de la tienda de aquí abajo.\n\n"
                + "Enlace en Google Play (ábrelo en tu móvil Android):\n"
                + play
                + "\n\n"
                + "Pasos rápidos:\n\n"
                + "1. Abre el enlace en la cuenta de Google que tiene acceso a la prueba cerrada "
                + "(la misma que usas en Play Store).\n"
                + "2. Instala o actualiza TarantulApp desde Google Play.\n"
                + "3. Abre la app e inicia sesión con el mismo correo y contraseña que en la web.\n\n"
                + "Importante: si instalaste antes con el enlace viejo de prueba interna (" + legacy + "), "
                + "no lo uses más — desinstala esa versión si hace falta y vuelve a instalar desde el enlace de la tienda.\n\n"
                + "La web sigue en "
                + url
                + " y puedes usar la PWA en Chrome si prefieres ese flujo.\n\n"
                + "Si Play dice que no tienes acceso, revisa la cuenta de Google correcta, o escríbenos: "
                + "responde a este correo o hello@tarantulapp.com.\n\n"
                + "Gracias por probar con nosotros.\n\n"
                + "— El equipo de TarantulApp\n";
    }

    private static String androidPlayBetaAnnouncementEn(String n, String url, String sendDate) {
        String play = ANDROID_PLAY_STORE_URL;
        String legacy = ANDROID_PLAY_LEGACY_INTERNAL_TEST_URL;
        return "Hi " + n + ",\n\n"
                + "Message date: " + sendDate + "\n\n"
                + "Big news: we’ve moved the Android app from the internal testing track to closed testing on Google Play. "
                + "From now on, use only the Store link below.\n\n"
                + "Google Play link (open on your Android phone):\n"
                + play
                + "\n\n"
                + "Quick steps:\n\n"
                + "1. Open the link while signed into the Google account that has access to closed testing "
                + "(same account you use with the Play Store).\n"
                + "2. Install or update TarantulApp from Google Play.\n"
                + "3. Open the app and sign in with the same email and password as the website.\n\n"
                + "Important: if you previously installed via the old internal-testing link (" + legacy + "), "
                + "don’t use it anymore — uninstall that build if needed and reinstall from the Store link above.\n\n"
                + "The web app at "
                + url
                + " still works, and you can install the PWA from Chrome on Android if you prefer.\n\n"
                + "If Play says you don’t have access, double-check your Google account, or reach out — "
                + "reply to this email or hello@tarantulapp.com.\n\n"
                + "Thank you for testing with us.\n\n"
                + "— The TarantulApp team\n";
    }

    private static String playEarlyAccessWebEs(String n, String url, String sendDate) {
        String play = ANDROID_PLAY_STORE_URL;
        String legacy = ANDROID_PLAY_LEGACY_INTERNAL_TEST_URL;
        return "Hola " + n + ",\n\n"
                + "Fecha del mensaje: " + sendDate + "\n\n"
                + "Esperamos que estés disfrutando TarantulApp en la web. Te escribimos para recordarte que ya puedes instalar la app "
                + "Android desde Google Play en acceso anticipado (lista de prueba cerrada), con la misma cuenta que usas en el "
                + "navegador.\n\n"
                + "Enlace en Google Play (ábrelo en tu móvil Android):\n"
                + play
                + "\n\n"
                + "Pasos rápidos:\n\n"
                + "1. Abre el enlace con la cuenta de Google que tenga acceso a la prueba cerrada (la misma que uses en Play Store).\n"
                + "2. Instala o actualiza TarantulApp desde Google Play.\n"
                + "3. Abre la app e inicia sesión con el mismo correo y contraseña que en la web.\n\n"
                + "Si antes instalaste con el enlace viejo de prueba interna (" + legacy + "), no lo uses: desinstala esa versión si "
                + "hace falta y vuelve a instalar desde el enlace de la tienda de arriba.\n\n"
                + "La web sigue en " + url + " . Si Play dice que no tienes acceso, revisa la cuenta de Google correcta o responde a "
                + "este correo.\n\n"
                + "¡Gracias por seguir con nosotros!\n\n"
                + "— El equipo de TarantulApp\n";
    }

    private static String playEarlyAccessWebEn(String n, String url, String sendDate) {
        String play = ANDROID_PLAY_STORE_URL;
        String legacy = ANDROID_PLAY_LEGACY_INTERNAL_TEST_URL;
        return "Hi " + n + ",\n\n"
                + "Message date: " + sendDate + "\n\n"
                + "We hope you’re enjoying TarantulApp on the web. This is a quick reminder that you can now install the Android app "
                + "from Google Play as an early-access (closed testing) build — same email and password you already use in the browser.\n\n"
                + "Google Play link (open on your Android phone):\n"
                + play
                + "\n\n"
                + "Quick steps:\n\n"
                + "1. Open the link while signed into the Google account that has access to closed testing (same account you use with "
                + "the Play Store).\n"
                + "2. Install or update TarantulApp from Google Play.\n"
                + "3. Open the app and sign in with the same email and password as the website.\n\n"
                + "Important: if you previously installed via the old internal-testing link (" + legacy + "), don’t use it anymore — "
                + "uninstall that build if needed and reinstall from the Store link above.\n\n"
                + "The web app is still at " + url + " . If Play says you don’t have access, double-check your Google account or reply "
                + "to this email.\n\n"
                + "Thanks for being with us!\n\n"
                + "— The TarantulApp team\n";
    }

    private static String playEarlyAccessWebFr(String n, String url, String sendDate) {
        String play = ANDROID_PLAY_STORE_URL;
        String legacy = ANDROID_PLAY_LEGACY_INTERNAL_TEST_URL;
        return "Bonjour " + n + ",\n\n"
                + "Date du message : " + sendDate + "\n\n"
                + "Nous espérons que vous appréciez TarantulApp sur le web. Petit rappel : vous pouvez maintenant installer l'app "
                + "Android depuis le Google Play en accès anticipé (test fermé), avec le même compte que sur le site.\n\n"
                + "Lien Google Play (à ouvrir sur votre téléphone Android) :\n"
                + play
                + "\n\n"
                + "Étapes rapides :\n\n"
                + "1. Ouvrez le lien avec le compte Google qui a accès au test fermé (le même que dans le Play Store).\n"
                + "2. Installez ou mettez à jour TarantulApp depuis Google Play.\n"
                + "3. Ouvrez l'app et connectez-vous avec le même e-mail et mot de passe que sur le web.\n\n"
                + "Si vous aviez installé via l'ancien lien de test interne (" + legacy + "), ne l'utilisez plus — désinstallez cette "
                + "version si besoin et réinstallez depuis le lien Play ci-dessus.\n\n"
                + "Le site reste sur " + url + " . Si le Play Store refuse l'accès, vérifiez le compte Google ou répondez à cet e-mail.\n\n"
                + "Merci de votre confiance !\n\n"
                + "— L'équipe TarantulApp\n";
    }

    /**
     * Vendor / store welcome (Mexico). Sent after admin flips {@code verifiedBreeder=true}. The recipient
     * is the storefront owner; copy explains the dynamic tier model (Starter $0 → Pro Shop $999 MXN/mo
     * based on monthly sold count), no-custody payment policy, and the verification kit needed to earn
     * the "Tienda Verificada" badge (which is intentionally NOT granted by activation alone).
     */
    private static String vendorWelcomeMxEs(String n, String url, String sendDate) {
        String sell = url + "/marketplace/sell";
        return "Hola " + n + ",\n\n"
                + "Fecha del mensaje: " + sendDate + "\n\n"
                + "Gracias por sumar tu tienda a TarantulApp. Activamos tu cuenta de vendor en el marketplace — este "
                + "correo te explica qué ya tienes activo, qué falta, y cómo conseguirlo.\n\n"
                + "Beneficios ACTIVOS desde hoy (sin costo inicial)\n\n"
                + "• Storefront en la app con tu marca, políticas de envío y contacto.\n"
                + "• Publicar en todas las categorías: tarántulas, proyectos de cría, comida viva, sustratos, "
                + "terrarios y accesorios.\n"
                + "• Hasta 250 anuncios activos + listing boost.\n"
                + "• Inbox de compradores dentro de la app con historial.\n"
                + "• Tier dinámico: empiezas en Vendor Starter ($0 MXN/mes) — sube y baja según ventas, sin "
                + "contratos ni permanencia.\n\n"
                + "Cómo funciona el cobro (sin custodia, sin escrow)\n\n"
                + "TarantulApp NO toca el dinero de tus ventas — tú cobras directo a tu cliente (transferencia, "
                + "MercadoPago, lo que ya uses). Tu suscripción mensual se ajusta sola según los anuncios que "
                + "marcas como vendidos:\n\n"
                + "  • Vendor Starter — 0 a 3 ventas / mes — $0 MXN\n"
                + "  • Vendor Activo — 4 a 12 ventas / mes — $199 MXN\n"
                + "  • Vendor Plus — 13 a 30 ventas / mes — $499 MXN\n"
                + "  • Vendor Pro Shop — 31+ ventas / mes — $999 MXN\n\n"
                + "Cada vez que cierras una venta marca el anuncio como vendido — ese es nuestro único contador. "
                + "Si un mes vendes 0, no pagas nada y mantienes storefront completo. No hay penalización por "
                + "bajar de tier.\n\n"
                + "Lo único pendiente: tu badge \"Tienda Verificada\"\n\n"
                + "El badge no se da por pagar — se gana. Es la señal de confianza que ven los compradores antes "
                + "de mandarte mensaje. Para que el equipo te lo active, responde este correo con lo siguiente.\n\n"
                + "Obligatorio:\n"
                + "1. INE (anverso y reverso). Solo se revisa al verificar, no se almacena a largo plazo.\n"
                + "2. 1 o 2 fotos del espacio donde mantienes los animales (rack, cuarto, terrarios actuales).\n"
                + "3. 3 a 5 fotos de inventario actual — en cada foto incluye un papelito a mano con tu "
                + "@handle de TarantulApp visible (prueba que las fotos son tuyas).\n"
                + "4. WhatsApp o Instagram con al menos 2 a 3 meses de actividad ligada a tu tienda/criadero.\n"
                + "5. Si vendes CITES (Poecilotheria metallica/regalis/ornata/rufilata/etc.): número de UMA o "
                + "permiso CITES de origen.\n\n"
                + "Opcional (acelera la revisión):\n"
                + "6. RFC con actividad económica relacionada.\n"
                + "7. 1 a 2 referencias de keepers/criadores reconocidos de la comunidad.\n"
                + "8. Si vendes insumos: factura de proveedor mayoreo de sustrato / comida viva.\n\n"
                + "Por qué pedimos esto\n\n"
                + "El badge protege la confianza de la comunidad. Los compradores se la juegan comprando "
                + "animales vivos a desconocidos por internet — el badge les dice \"este sí existe, tiene "
                + "espacio real, tiene inventario propio, no es reventa con fotos robadas\". Te protege a ti "
                + "también: tiendas serias destacan, reventas se filtran.\n\n"
                + "La revisión es humana, suele tomar 24 a 72 horas tras recibir tu respuesta. Mientras llega "
                + "el badge ya puedes publicar todo. Sin el badge, tu storefront aparece como \"Tienda nueva\" "
                + "hasta terminar la verificación.\n\n"
                + "Primeros pasos (15 a 30 min)\n\n"
                + "1. Entra en " + url + "\n"
                + "2. Ve a Marketplace > Vender: " + sell + "\n"
                + "3. Configura tu storefront: nombre, tagline, política de envío, tiempos y contacto.\n"
                + "4. Publica tu primer anuncio con foto clara, precio en MXN y descripción honesta.\n"
                + "5. Repite con tu inventario fuerte (tarántulas + insumos si manejas).\n"
                + "6. Responde este correo con la verificación para que llegue tu badge.\n\n"
                + "Reglas rápidas\n\n"
                + "• Cumple normativa local de fauna, envíos y permisos (UMA / CITES si corresponde).\n"
                + "• TarantulApp no custodia pagos: acuerden precio y envío en el chat de la app, y paguen "
                + "directo con el método que ya confíen.\n"
                + "• Fotos reales y stock actualizado; cuando se vende marca el anuncio como vendido — eso es "
                + "lo único que cuenta para tu tier mensual.\n\n"
                + "¿Algo no carga? Usa \"Reportar un bug\" en la app o responde este correo con tu @handle "
                + "deseado y dudas de categorías.\n\n"
                + "¡Bienvenido al marketplace — nos encanta ver el catálogo crecer!\n\n"
                + "— El equipo de TarantulApp\n";
    }

    private static String vendorWelcomeMxEn(String n, String url, String sendDate) {
        String sell = url + "/marketplace/sell";
        return "Hi " + n + ",\n\n"
                + "Message date: " + sendDate + "\n\n"
                + "Thanks for bringing your shop to TarantulApp. Your vendor account is activated in the "
                + "marketplace — this email walks you through what is already active, what is still pending, "
                + "and how to earn it.\n\n"
                + "What is ACTIVE from day one (no upfront cost)\n\n"
                + "• Storefront in the app with your brand, shipping policies, and contact details.\n"
                + "• Listings across every category: tarantulas, breeding projects, live food, substrates, "
                + "terrariums, and accessories.\n"
                + "• Up to 250 active listings + listing boost.\n"
                + "• In-app buyer inbox with history.\n"
                + "• Dynamic tier: you start on Vendor Starter ($0 MXN/month) — scales up or down with your "
                + "sales, no contracts, no minimums.\n\n"
                + "How billing works (no custody, no escrow)\n\n"
                + "TarantulApp NEVER handles your sales money — you collect directly from your customer (bank "
                + "transfer, MercadoPago, whatever you already use). Your monthly subscription self-adjusts "
                + "based on how many listings you mark as sold each month:\n\n"
                + "  • Vendor Starter — 0 to 3 sales / month — $0 MXN\n"
                + "  • Vendor Activo — 4 to 12 sales / month — $199 MXN\n"
                + "  • Vendor Plus — 13 to 30 sales / month — $499 MXN\n"
                + "  • Vendor Pro Shop — 31+ sales / month — $999 MXN\n\n"
                + "Every time you close a sale, mark the listing as sold — that is our only counter. If you "
                + "sell zero in a month, you pay nothing and keep your full storefront. No penalty for "
                + "dropping a tier.\n\n"
                + "One thing pending: your \"Verified Shop\" badge\n\n"
                + "The badge is not given out for paying — it is earned. It is the trust signal buyers see "
                + "before messaging you. For the team to activate it, reply to this email with the "
                + "following.\n\n"
                + "Required:\n"
                + "1. Government-issued ID (front and back of INE or equivalent). Reviewed only, not archived "
                + "long-term.\n"
                + "2. 1 or 2 photos of the space where you keep the animals (rack, room, current enclosures).\n"
                + "3. 3 to 5 inventory photos — in each photo include a handwritten note with your TarantulApp "
                + "@handle visible (proves the photos are yours).\n"
                + "4. WhatsApp or Instagram with at least 2 to 3 months of activity tied to your shop/breeding.\n"
                + "5. If you sell CITES species (Poecilotheria metallica/regalis/ornata/rufilata/etc.): UMA "
                + "number or CITES origin permit reference.\n\n"
                + "Optional (speeds up review):\n"
                + "6. RFC / tax ID with related business activity.\n"
                + "7. 1 to 2 references from recognized keepers/breeders in the community.\n"
                + "8. If you sell supplies: invoice from a wholesale substrate / live food supplier.\n\n"
                + "Why we ask for this\n\n"
                + "The badge protects community trust. Buyers are taking a real risk buying live animals from "
                + "strangers online — the badge tells them \"this person exists, has real space, has their own "
                + "inventory, is not a reseller with stolen photos\". It protects you too: serious shops stand "
                + "out, resellers get filtered.\n\n"
                + "Review is human, usually 24 to 72 hours after we receive your reply. While the badge is "
                + "pending you can already publish everything. Without the badge, your storefront shows as "
                + "\"New shop\" until verification clears.\n\n"
                + "First steps (15 to 30 min)\n\n"
                + "1. Log in at " + url + "\n"
                + "2. Go to Marketplace > Sell: " + sell + "\n"
                + "3. Set up your storefront: name, tagline, shipping policy, times and contact.\n"
                + "4. Publish your first listing with a clear photo, price in MXN, honest description.\n"
                + "5. Repeat with your strongest inventory (tarantulas + supplies if you carry them).\n"
                + "6. Reply to this email with the verification kit so we can hand you the badge.\n\n"
                + "Quick rules\n\n"
                + "• Follow local wildlife, shipping, and permit rules (UMA / CITES if applicable).\n"
                + "• TarantulApp does not custody payments: agree on price and shipping in the app chat, then "
                + "pay directly with a method you already trust.\n"
                + "• Real photos and current stock; once sold, mark the listing as sold — that is the only "
                + "signal that counts toward your monthly tier.\n\n"
                + "Anything not loading? Use \"Report a bug\" in the app or reply with your desired @handle "
                + "and category questions.\n\n"
                + "Welcome to the marketplace — we love watching the catalog grow.\n\n"
                + "— The TarantulApp team\n";
    }

    private static String vendorWelcomeMxFr(String n, String url, String sendDate) {
        String sell = url + "/marketplace/sell";
        return "Bonjour " + n + ",\n\n"
                + "Date du message : " + sendDate + "\n\n"
                + "Merci d'apporter votre boutique à TarantulApp. Votre compte vendeur est activé dans la "
                + "marketplace — cet e-mail détaille ce qui est déjà actif, ce qui reste en attente, et "
                + "comment l'obtenir.\n\n"
                + "Avantages ACTIFS dès aujourd'hui (sans coût initial)\n\n"
                + "• Boutique dans l'app avec votre marque, politiques d'envoi et contact.\n"
                + "• Annonces dans toutes les catégories : mygales, projets d'élevage, nourriture vive, "
                + "substrats, terrariums et accessoires.\n"
                + "• Jusqu'à 250 annonces actives + listing boost.\n"
                + "• Boîte de réception acheteurs dans l'app avec historique.\n"
                + "• Tier dynamique : vous démarrez en Vendor Starter (0 MXN/mois) — monte ou descend selon "
                + "vos ventes, sans contrat ni engagement.\n\n"
                + "Comment fonctionne la facturation (sans séquestre)\n\n"
                + "TarantulApp NE touche JAMAIS l'argent de vos ventes — vous encaissez directement de votre "
                + "client (virement, MercadoPago, ce que vous utilisez déjà). Votre abonnement mensuel "
                + "s'ajuste selon le nombre d'annonces marquées comme vendues :\n\n"
                + "  • Vendor Starter — 0 à 3 ventes / mois — 0 MXN\n"
                + "  • Vendor Activo — 4 à 12 ventes / mois — 199 MXN\n"
                + "  • Vendor Plus — 13 à 30 ventes / mois — 499 MXN\n"
                + "  • Vendor Pro Shop — 31+ ventes / mois — 999 MXN\n\n"
                + "À chaque vente conclue, marquez l'annonce comme vendue — c'est notre seul compteur. Si "
                + "vous vendez zéro un mois, vous ne payez rien et gardez votre boutique complète. Aucune "
                + "pénalité à descendre de tier.\n\n"
                + "Ce qui reste en attente : votre badge \"Boutique Vérifiée\"\n\n"
                + "Le badge n'est pas donné contre paiement — il se gagne. C'est le signal de confiance que "
                + "voient les acheteurs avant de vous contacter. Pour que l'équipe l'active, répondez à cet "
                + "e-mail avec ce qui suit.\n\n"
                + "Obligatoire :\n"
                + "1. Pièce d'identité officielle (recto/verso INE ou équivalent). Vérifiée uniquement, pas "
                + "archivée à long terme.\n"
                + "2. 1 ou 2 photos de l'espace où vous gardez les animaux (rack, pièce, terrariums actuels).\n"
                + "3. 3 à 5 photos d'inventaire actuel — sur chaque photo, un papier manuscrit avec votre "
                + "@handle TarantulApp visible (preuve que les photos sont les vôtres).\n"
                + "4. WhatsApp ou Instagram avec au moins 2 à 3 mois d'activité liée à votre boutique/"
                + "élevage.\n"
                + "5. Si vous vendez CITES (Poecilotheria metallica/regalis/ornata/rufilata/etc.) : numéro "
                + "UMA ou permis CITES d'origine.\n\n"
                + "Optionnel (accélère la revue) :\n"
                + "6. RFC / identifiant fiscal avec activité économique liée.\n"
                + "7. 1 à 2 références d'éleveurs reconnus de la communauté.\n"
                + "8. Si vous vendez des consommables : facture d'un fournisseur de gros de substrat / "
                + "nourriture vive.\n\n"
                + "Pourquoi on demande ça\n\n"
                + "Le badge protège la confiance de la communauté. Les acheteurs prennent un vrai risque en "
                + "achetant des animaux vivants à des inconnus en ligne — le badge leur dit \"cette personne "
                + "existe, a un espace réel, son propre inventaire, et n'est pas un revendeur avec photos "
                + "volées\". Ça vous protège aussi : les boutiques sérieuses ressortent.\n\n"
                + "La revue est humaine, généralement 24 à 72 heures après réception de votre réponse. En "
                + "attendant le badge, vous pouvez déjà tout publier. Sans le badge, votre boutique apparaît "
                + "comme \"Nouvelle boutique\" jusqu'à la fin de la vérification.\n\n"
                + "Premiers pas (15 à 30 min)\n\n"
                + "1. Connectez-vous sur " + url + "\n"
                + "2. Allez dans Marketplace > Vendre : " + sell + "\n"
                + "3. Configurez votre boutique : nom, tagline, politique d'envoi, délais et contact.\n"
                + "4. Publiez votre première annonce avec photo claire, prix en MXN, description honnête.\n"
                + "5. Répétez avec votre inventaire principal (mygales + consommables si vous en proposez).\n"
                + "6. Répondez à cet e-mail avec le kit de vérification pour recevoir le badge.\n\n"
                + "Règles rapides\n\n"
                + "• Respectez la réglementation locale faune, envois et permis (UMA / CITES si applicable).\n"
                + "• TarantulApp ne séquestre pas les paiements : convenez prix et envoi dans le chat de "
                + "l'app, puis payez directement via la méthode que vous connaissez déjà.\n"
                + "• Photos réelles et stock à jour ; une fois vendu, marquez l'annonce comme vendue — c'est "
                + "le seul signal qui compte pour votre tier mensuel.\n\n"
                + "Si quelque chose cloche, utilisez « Report a bug » dans l'app ou répondez avec votre "
                + "@handle souhaité et vos questions de catégories.\n\n"
                + "Bienvenue dans la marketplace — nous adorons voir le catalogue grandir.\n\n"
                + "— L'équipe TarantulApp\n";
    }

    private static String week1Es(String n, String url, String sendDate) {
        return "Hola " + n + ",\n\n"
                + "Fecha del mensaje: " + sendDate + "\n\n"
                + "¡Semana 1 de la beta! Esta semana nos enfocamos en el día a día:\n\n"
                + "• Registra al menos 2 alimentaciones y revisa que las tarántulas tengan fotos o notas.\n"
                + "• Añade al menos un registro de muda o actualización de tamaño si aplica.\n"
                + "• Crea un recordatorio (ej. próxima comida o revisión de humedad).\n\n"
                + "App: " + url + "\n\n"
                + "Cuando termines, envía un feedback corto (bug, idea o \"todo bien\") respondiendo este correo "
                + "o con \"Reportar un bug\" en la app.\n\n"
                + "— TarantulApp\n";
    }

    private static String week1En(String n, String url, String sendDate) {
        return "Hi " + n + ",\n\n"
                + "Message date: " + sendDate + "\n\n"
                + "Week 1 of the beta — day-to-day workflow:\n\n"
                + "• Log at least 2 feedings; make sure spiders have a photo or notes.\n"
                + "• Add at least one molt or size update when relevant.\n"
                + "• Create one reminder (next feed, humidity check, etc.).\n\n"
                + "App: " + url + "\n\n"
                + "When done, send quick feedback (bug, idea, or \"all good\") by replying here or using "
                + "\"Report a bug\" in the app.\n\n"
                + "— TarantulApp\n";
    }

    private static String week2Es(String n, String url, String sendDate) {
        return "Hola " + n + ",\n\n"
                + "Fecha del mensaje: " + sendDate + "\n\n"
                + "Semana 2: refina tu rutina — fotos, etiquetas y recordatorios para toda la colección.\n\n"
                + "• Revisa que cada tarántula activa tenga al menos una foto reciente o nota.\n"
                + "• Usa el feed o el perfil para ver cómo se ve tu historial.\n\n"
                + "App: " + url + "\n\n"
                + "— TarantulApp\n";
    }

    private static String week2En(String n, String url, String sendDate) {
        return "Hi " + n + ",\n\n"
                + "Message date: " + sendDate + "\n\n"
                + "Week 2: tighten your routine — photos, labels, and reminders across the collection.\n\n"
                + "• Ensure each active spider has a recent photo or note.\n"
                + "• Browse your history from feed or profile.\n\n"
                + "App: " + url + "\n\n"
                + "— TarantulApp\n";
    }

    private static String week3Es(String n, String url, String sendDate) {
        return "Hola " + n + ",\n\n"
                + "Fecha del mensaje: " + sendDate + "\n\n"
                + "Semana 3: comunidad — visita el feed, reacciona a publicaciones y completa tu perfil de criador.\n\n"
                + "App: " + url + "\n\n"
                + "— TarantulApp\n";
    }

    private static String week3En(String n, String url, String sendDate) {
        return "Hi " + n + ",\n\n"
                + "Message date: " + sendDate + "\n\n"
                + "Week 3: community — browse the feed, engage with posts, and polish your keeper profile.\n\n"
                + "App: " + url + "\n\n"
                + "— TarantulApp\n";
    }

    private static String week4Es(String n, String url, String sendDate) {
        return "Hola " + n + ",\n\n"
                + "Fecha del mensaje: " + sendDate + "\n\n"
                + "Semana 4: marketplace y mensajes — explora listados, guarda favoritos y prueba el chat si aplica.\n\n"
                + "App: " + url + "\n\n"
                + "— TarantulApp\n";
    }

    private static String week4En(String n, String url, String sendDate) {
        return "Hi " + n + ",\n\n"
                + "Message date: " + sendDate + "\n\n"
                + "Week 4: marketplace & chat — explore listings, save favorites, try messaging where relevant.\n\n"
                + "App: " + url + "\n\n"
                + "— TarantulApp\n";
    }

    private static String week5Es(String n, String url, String sendDate) {
        return "Hola " + n + ",\n\n"
                + "Fecha del mensaje: " + sendDate + "\n\n"
                + "Semana 5: prueba Pro (si aplica), etiquetas QR y pulido — revisa límites del plan y funciones avanzadas.\n\n"
                + "App: " + url + "\n\n"
                + "— TarantulApp\n";
    }

    private static String week5En(String n, String url, String sendDate) {
        return "Hi " + n + ",\n\n"
                + "Message date: " + sendDate + "\n\n"
                + "Week 5: Pro trial (if applicable), QR labels, polish — check plan limits and advanced tools.\n\n"
                + "App: " + url + "\n\n"
                + "— TarantulApp\n";
    }

    private static String week6Es(String n, String url, String sendDate) {
        return "Hola " + n + ",\n\n"
                + "Fecha del mensaje: " + sendDate + "\n\n"
                + "Semana 6: cierre de beta — encuesta final y (si quieres) un breve testimonio. "
                + "¡Gracias por el tiempo y la honestidad!\n\n"
                + "App: " + url + "\n\n"
                + "— TarantulApp\n";
    }

    private static String week6En(String n, String url, String sendDate) {
        return "Hi " + n + ",\n\n"
                + "Message date: " + sendDate + "\n\n"
                + "Week 6: wrap-up — final survey and an optional short testimonial. Thank you for your time and candor!\n\n"
                + "App: " + url + "\n\n"
                + "— TarantulApp\n";
    }

    private static String weekGenericEs(String n, String url, String sendDate) {
        return "Hola " + n + ",\n\n"
                + "Fecha del mensaje: " + sendDate + "\n\n"
                + "Actualización de la beta TarantulApp.\n\n"
                + "App: " + url + "\n\n"
                + "— TarantulApp\n";
    }

    private static String weekGenericEn(String n, String url, String sendDate) {
        return "Hi " + n + ",\n\n"
                + "Message date: " + sendDate + "\n\n"
                + "TarantulApp beta update.\n\n"
                + "App: " + url + "\n\n"
                + "— TarantulApp\n";
    }
}
