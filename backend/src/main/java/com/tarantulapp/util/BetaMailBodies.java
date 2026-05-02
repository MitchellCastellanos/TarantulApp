package com.tarantulapp.util;

import java.util.Locale;
import java.util.Set;

/**
 * Plain-text bodies for beta welcome + weekly campaign emails. Kept in sync with
 * {@code frontend/src/utils/welcomeBetaEmail.js} for the welcome copy.
 */
public final class BetaMailBodies {

    public static final String DEFAULT_APP_URL = "https://tarantulapp.com";

    public static final Set<String> BATCH_CAMPAIGN_KEYS = Set.of(
            "week_1", "week_2", "week_3", "week_4", "week_5", "week_6"
    );

    private BetaMailBodies() {
    }

    public static boolean isBatchCampaignKey(String key) {
        return key != null && BATCH_CAMPAIGN_KEYS.contains(key.trim().toLowerCase(Locale.ROOT));
    }

    public static String welcomeSubject(String locale) {
        return "en".equalsIgnoreCase(normalizeLocale(locale))
                ? "TarantulApp — Welcome to the closed beta"
                : "TarantulApp — Bienvenida a la beta cerrada";
    }

    public static String campaignSubject(String campaignKey, String locale) {
        String k = campaignKey == null ? "" : campaignKey.trim().toLowerCase(Locale.ROOT);
        boolean en = "en".equalsIgnoreCase(normalizeLocale(locale));
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
            default -> en ? "TarantulApp beta — Update" : "TarantulApp beta — Actualización";
        };
    }

    public static String normalizeLocale(String locale) {
        if (locale == null || locale.isBlank()) {
            return "es";
        }
        String t = locale.trim().toLowerCase(Locale.ROOT);
        return t.startsWith("en") ? "en" : "es";
    }

    public static String welcomeEs(String name, String email, String password, String appUrl, String sendDate) {
        String n = (name == null || name.isBlank()) ? "criador" : name.trim();
        String url = (appUrl == null || appUrl.isBlank()) ? DEFAULT_APP_URL : appUrl.trim();
        String e = email == null ? "" : email.trim();
        String p = password == null ? "" : password;
        return "Hola " + n + ",\n"
                + "\n"
                + "Fecha del mensaje: " + sendDate + "\n"
                + "\n"
                + "Felicidades: has sido aceptado en la beta cerrada de TarantulApp. De todos los criadores que se postularon, "
                + "eres uno de los pocos elegidos para ayudarnos a moldear la plataforma antes de su lanzamiento público.\n"
                + "\n"
                + "Importante para este primer batch:\n"
                + "• La experiencia Android nativa en Play Store llegará en los próximos días; por ahora centrémonos en la web app.\n"
                + "• Durante el fin de semana puedes explorar la app, crear tu cuenta y registrar tu colección. "
                + "El lunes recibirás por correo las misiones específicas de la semana.\n"
                + "\n"
                + "Cómo entrar:\n"
                + "1) Abre " + url + " y usa el botón de acceso beta (\"Beta tester login\" / acceso beta) "
                + "en la pantalla previa al lanzamiento.\n"
                + "2) Inicia sesión con el correo y la contraseña que aparecen abajo.\n"
                + "\n"
                + "Web app en el móvil:\n"
                + "• En iPhone/iPad: Safari → Compartir → \"Añadir a pantalla de inicio\" para un acceso rápido tipo app.\n"
                + "• En Android (Chrome): menú ⋮ → \"Instalar app\" o \"Añadir a la pantalla principal\" si el navegador lo ofrece.\n"
                + "• En los próximos días enviaremos a usuarios Android el acceso para descargar y probar directamente desde Play Store.\n"
                + "\n"
                + "Esto es lo que necesitas saber:\n"
                + "\n"
                + "1) Tu acceso\n"
                + "   • Web: " + url + "\n"
                + "   • Email: " + e + "\n"
                + "   • Contraseña: " + p + "\n"
                + "\n"
                + "   Tu cuenta está marcada como beta tester: verás las funciones beta y el botón \"Reportar un bug\".\n"
                + "\n"
                + "2) El plan (6 semanas)\n"
                + "   • Semana 0 — Configura tu cuenta y mete tu colección.\n"
                + "   • Semanas 1–2 — Día a día: comidas, mudas, fotos, recordatorios.\n"
                + "   • Semanas 3–4 — Feed comunidad, perfil de criador, marketplace, chat.\n"
                + "   • Semana 5 — Prueba Pro, etiquetas QR y detalles finos.\n"
                + "   • Semana 6 — Encuesta final + tu testimonio.\n"
                + "\n"
                + "3) Cómo enviar feedback\n"
                + "   • Bugs: toca \"Reportar un bug\" dentro de la app — adjunta página, dispositivo y versión.\n"
                + "   • Ideas / preguntas: responde a este correo.\n"
                + "   • Cada lunes te llegará un correo corto con la misión de la semana.\n"
                + "\n"
                + "4) Lo que te pedimos\n"
                + "   • Usa la app al menos unos minutos, 3+ días a la semana.\n"
                + "   • Envía al menos un feedback por semana (bug, idea o \"todo bien\").\n"
                + "   • Sé honesto — preferimos un \"esto confunde\" antes que un silencio cortés.\n"
                + "\n"
                + "Gracias por confiarnos tu colección. Construyamos juntos la mejor app de tarántulas del mundo.\n"
                + "\n"
                + "— El equipo de TarantulApp\n";
    }

    public static String welcomeEn(String name, String email, String password, String appUrl, String sendDate) {
        String n = (name == null || name.isBlank()) ? "keeper" : name.trim();
        String url = (appUrl == null || appUrl.isBlank()) ? DEFAULT_APP_URL : appUrl.trim();
        String e = email == null ? "" : email.trim();
        String p = password == null ? "" : password;
        return "Hi " + n + ",\n"
                + "\n"
                + "Message date: " + sendDate + "\n"
                + "\n"
                + "Congratulations — you've been accepted into the TarantulApp closed beta. Among everyone who applied, "
                + "you're one of the few helping us shape the platform before public launch.\n"
                + "\n"
                + "Important for this first batch:\n"
                + "• Native Android on Play Store is shipping in the next few days; for now please focus on the web app.\n"
                + "• Over the weekend, explore the product, set up your account, and add your collection. "
                + "On Monday you'll get the week's missions by email.\n"
                + "\n"
                + "How to sign in:\n"
                + "1) Open " + url + " and use the beta gate (\"Beta tester login\") on the pre-launch screen.\n"
                + "2) Sign in with the email and password below.\n"
                + "\n"
                + "Web app on your phone:\n"
                + "• iPhone/iPad: Safari -> Share -> \"Add to Home Screen\".\n"
                + "• Android (Chrome): Menu -> \"Install app\" or \"Add to Home screen\" when offered.\n"
                + "• Android testers will receive Play Store access to install and test directly in the coming days.\n"
                + "\n"
                + "What you need to know:\n"
                + "\n"
                + "1) Your access\n"
                + "   • Web: " + url + "\n"
                + "   • Email: " + e + "\n"
                + "   • Password: " + p + "\n"
                + "\n"
                + "   Your account is flagged as a beta tester — you'll see beta features and the \"Report a bug\" button.\n"
                + "\n"
                + "2) The 6-week plan\n"
                + "   • Week 0 — Set up your account and import your collection.\n"
                + "   • Weeks 1-2 — Day-to-day: feeds, molts, photos, reminders.\n"
                + "   • Weeks 3-4 — Community feed, keeper profile, marketplace, chat.\n"
                + "   • Week 5 — Pro trial, QR labels, polish.\n"
                + "   • Week 6 — Final survey + your testimonial.\n"
                + "\n"
                + "3) How to send feedback\n"
                + "   • Bugs: tap \"Report a bug\" in the app — it attaches page, device, and version.\n"
                + "   • Ideas / questions: reply to this email.\n"
                + "   • Each Monday you'll get a short email with the weekly mission.\n"
                + "\n"
                + "4) What we ask\n"
                + "   • Use the app a few minutes a day, 3+ days per week.\n"
                + "   • Send at least one piece of feedback per week (bug, idea, or \"all good\").\n"
                + "   • Be honest — we prefer \"this is confusing\" over polite silence.\n"
                + "\n"
                + "Thanks for trusting us with your collection. Let's build the best tarantula app together.\n"
                + "\n"
                + "— The TarantulApp team\n";
    }

    public static String campaignBody(String campaignKey, String locale, String name, String appUrl, String sendDate) {
        String loc = normalizeLocale(locale);
        String n = (name == null || name.isBlank()) ? (("en".equals(loc)) ? "keeper" : "criador") : name.trim();
        String url = (appUrl == null || appUrl.isBlank()) ? DEFAULT_APP_URL : appUrl.trim();
        String k = campaignKey == null ? "" : campaignKey.trim().toLowerCase(Locale.ROOT);
        if ("en".equals(loc)) {
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
            default -> weekGenericEn(n, url, sendDate);
        };
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
