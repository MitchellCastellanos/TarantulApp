package com.tarantulapp.service;

import com.resend.Resend;
import com.resend.services.emails.model.CreateEmailOptions;
import com.tarantulapp.entity.ProDayGrantSource;
import com.tarantulapp.util.BetaMailBodies;
import com.tarantulapp.util.LogSafe;
import com.tarantulapp.util.SupportedLocales;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.MessageSource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.FormatStyle;
import java.util.Locale;
import java.util.UUID;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final JavaMailSender mailSender;
    private final MessageSource messageSource;

    @Value("${resend.api-key:}")
    private String resendApiKey;

    @Value("${app.mail.from:noreply@tarantulapp.com}")
    private String fromAddress;

    @Value("${app.mail.from-name:TarantulApp}")
    private String fromName;

    @Value("${app.mail.reply-to:}")
    private String replyToAddress;

    @Value("${app.base-url:http://localhost:5173}")
    private String baseUrl;

    @Value("${app.play-store-listing-url:https://play.google.com/store/apps/details?id=com.tarantulapp.app}")
    private String playStoreListingUrl;

    @Value("${app.mail.admin-notify-to:admin@tarantulapp.com}")
    private String adminNotifyTo;

    public EmailService(JavaMailSender mailSender, MessageSource messageSource) {
        this.mailSender = mailSender;
        this.messageSource = messageSource;
    }

    // ── Core routing ──────────────────────────────────────────────────────────

    private void doSend(String to, String subject, String text) throws Exception {
        if (resendApiKey != null && !resendApiKey.isBlank()) {
            Resend resend = new Resend(resendApiKey);
            String fromField = fromName + " <" + fromAddress + ">";
            CreateEmailOptions opts = CreateEmailOptions.builder()
                    .from(fromField)
                    .to(to)
                    .subject(subject)
                    .text(text)
                    .build();
            resend.emails().send(opts);
        } else {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, "UTF-8");
            helper.setFrom(fromAddress, fromName);
            helper.setTo(to);
            helper.setSubject(subject);
            if (replyToAddress != null && !replyToAddress.isBlank()) {
                helper.setReplyTo(replyToAddress);
            }
            helper.setText(text);
            mailSender.send(msg);
        }
    }

    // ── Public methods ────────────────────────────────────────────────────────

    public void sendPasswordReset(String toEmail, String token) {
        String resetUrl = baseUrl + "/reset-password?token=" + token;
        try {
            doSend(toEmail,
                "TarantulApp — Reset de contraseña / Password Reset",
                "Hola,\n\n" +
                "Recibimos una solicitud para restablecer tu contraseña.\n" +
                "Haz clic en el siguiente enlace (válido por 1 hora):\n\n" +
                resetUrl + "\n\n" +
                "Si no solicitaste esto, ignora este correo.\n\n" +
                "---\n" +
                "Hello,\n\n" +
                "We received a request to reset your password.\n" +
                "Click the link below (valid for 1 hour):\n\n" +
                resetUrl + "\n\n" +
                "If you didn't request this, ignore this email.\n\n" +
                "— TarantulApp"
            );
            log.info("Password reset email sent to {}", LogSafe.maskEmail(toEmail));
        } catch (Exception e) {
            log.error("Failed to send reset email to {}: {}", LogSafe.maskEmail(toEmail), e.getMessage(), e);
            throw new RuntimeException("No se pudo enviar el correo de reseteo");
        }
    }

    public void sendSmtpTestEmail(String toEmail) {
        try {
            doSend(toEmail,
                "TarantulApp — mail test",
                "If you received this message, outbound email from the TarantulApp backend is working.\n\n" +
                "— TarantulApp"
            );
            log.info("Mail test sent to {}", LogSafe.maskEmail(toEmail));
        } catch (Exception e) {
            log.error("Mail test failed for {}: {}", LogSafe.maskEmail(toEmail), e.getMessage(), e);
            throw new RuntimeException("Mail test failed: " + e.getMessage());
        }
    }

    public void sendWelcomeTrialStarted(String toEmail, String displayName, LocalDateTime trialEndsAt) {
        String greetingEs = (displayName != null && !displayName.isBlank()) ? displayName.trim() : "keeper";
        String greetingEn = greetingEs;
        String trialEndsEs = trialEndsAt != null ? trialEndsAt.format(DATE_FMT) : "unos 7 días";
        String trialEndsEn = trialEndsAt != null ? trialEndsAt.format(DATE_FMT) : "about 7 days";
        String web = stripTrailingSlash(baseUrl == null ? "" : baseUrl.trim());
        if (web.isBlank()) {
            web = "https://tarantulapp.com";
        }
        String play = (playStoreListingUrl == null || playStoreListingUrl.isBlank())
                ? "https://play.google.com/store/apps/details?id=com.tarantulapp.app"
                : playStoreListingUrl.trim();
        try {
            doSend(toEmail,
                "Bienvenido a TarantulApp · early users | Welcome — you're in early",
                "Hola " + greetingEs + ",\n\n" +
                "¡Bienvenido/a a TarantulApp! Estás entre las primeras cuentas mientras pasamos " +
                "a prueba abierta en Google Play. No hay tareas obligatorias: usa la app a tu ritmo " +
                "y, si te nace, mándanos feedback (desde la app o respondiendo este correo).\n\n" +
                "Tu prueba gratuita Pro ya está activa y termina el: " + trialEndsEs + ".\n" +
                "Importante: no hay cobro automático al cerrar la prueba. Te mandaremos un recordatorio antes.\n\n" +
                "Descarga Android (Google Play): " + play + "\n" +
                "Usa la web: " + web + "\n\n" +
                "Gracias por ser de los primeros.\n\n" +
                "— TarantulApp\n\n" +
                "---\n\n" +
                "Hi " + greetingEn + ",\n\n" +
                "Welcome to TarantulApp — you're one of our early users as we widen access on Google Play. " +
                "There are no required tasks: use the app at your own pace, and share feedback anytime " +
                "(in-app bug reporter or by replying to this email).\n\n" +
                "Your complimentary Pro trial is active and ends: " + trialEndsEn + ".\n" +
                "There's no automatic charge when it ends — we'll remind you beforehand.\n\n" +
                "Android (Google Play): " + play + "\n" +
                "Web app: " + web + "\n\n" +
                "Thanks for being early.\n\n" +
                "— TarantulApp"
            );
            log.info("Welcome trial email sent to {}", LogSafe.maskEmail(toEmail));
        } catch (Exception e) {
            log.error("Failed to send welcome/trial email to {}: {}", LogSafe.maskEmail(toEmail), e.getMessage());
        }
    }

    private static String stripTrailingSlash(String raw) {
        if (raw == null || raw.isEmpty()) return "";
        int end = raw.length();
        while (end > 0 && raw.charAt(end - 1) == '/') {
            end--;
        }
        return end == raw.length() ? raw : raw.substring(0, end);
    }

    public void sendTrialEndingReminder(String toEmail, String displayName, LocalDateTime trialEndsAt) {
        String greeting = (displayName != null && !displayName.isBlank()) ? displayName : "amigo arácnido";
        String trialEndsText = trialEndsAt != null ? trialEndsAt.format(DATE_FMT) : "pronto";
        try {
            doSend(toEmail,
                "Recordatorio: tu prueba Pro termina en 2 días",
                "Hola " + greeting + ",\n\n" +
                "Te recordamos que tu prueba Pro termina en 2 días.\n" +
                "Fecha de fin: " + trialEndsText + ".\n\n" +
                "No hay cobro automático al finalizar la prueba.\n" +
                "Si quieres continuar en Pro, puedes activarlo manualmente desde la app.\n\n" +
                "- TarantulApp Team"
            );
            log.info("Trial ending reminder sent to {}", LogSafe.maskEmail(toEmail));
        } catch (Exception e) {
            log.error("Failed to send trial reminder to {}: {}", LogSafe.maskEmail(toEmail), e.getMessage());
        }
    }

    public void sendProActivated(String toEmail, String displayName, String preferredLocale) {
        Locale locale = SupportedLocales.toLocale(preferredLocale);
        String greetingName = greetingFallback(displayName, locale);
        String subject = messageSource.getMessage("email.proActivated.subject", null, locale);
        StringBuilder body = new StringBuilder();
        body.append(messageSource.getMessage("email.proActivated.greeting", new Object[]{greetingName}, locale)).append("\n\n");
        body.append(messageSource.getMessage("email.proActivated.body", null, locale)).append("\n\n");
        body.append(messageSource.getMessage("email.proActivated.help", null, locale)).append("\n\n");
        body.append(messageSource.getMessage("email.proActivated.closing", null, locale));
        try {
            doSend(toEmail, subject, body.toString());
            log.info("Pro activation email sent to {} (locale={})", LogSafe.maskEmail(toEmail), locale.toLanguageTag());
        } catch (Exception e) {
            log.error("Failed to send pro activation email to {}: {}", LogSafe.maskEmail(toEmail), e.getMessage());
        }
    }

    /**
     * Notifies the user that their Pro entitlement was extended by {@code days}. Localized via
     * {@code messages_{locale}.properties}; reason is required for {@link ProDayGrantSource#ADMIN}.
     * The email also exposes how many days the user now has and how to earn more (gamification hooks).
     */
    public void sendProDaysAdded(
            String toEmail,
            String displayName,
            String preferredLocale,
            int days,
            ProDayGrantSource source,
            String reason,
            int totalDaysRemaining,
            LocalDateTime trialEndsAt
    ) {
        Locale locale = SupportedLocales.toLocale(preferredLocale);
        String greetingName = greetingFallback(displayName, locale);
        String subject = messageSource.getMessage("email.proDaysAdded.subject", new Object[]{days}, locale);
        StringBuilder body = new StringBuilder();
        body.append(messageSource.getMessage("email.proDaysAdded.greeting", new Object[]{greetingName}, locale)).append("\n\n");
        body.append(messageSource.getMessage("email.proDaysAdded.intro", new Object[]{days}, locale)).append('\n');
        Object[] sourceArgs = (source == ProDayGrantSource.ADMIN)
                ? new Object[]{reason == null || reason.isBlank() ? "-" : reason}
                : new Object[0];
        body.append(messageSource.getMessage("email.proDaysAdded.source." + source.name(), sourceArgs, locale)).append("\n\n");
        body.append(messageSource.getMessage("email.proDaysAdded.totalRemaining", new Object[]{totalDaysRemaining}, locale)).append('\n');
        if (trialEndsAt != null) {
            String when = DateTimeFormatter.ofLocalizedDate(FormatStyle.LONG).withLocale(locale).format(trialEndsAt.toLocalDate());
            body.append(messageSource.getMessage("email.proDaysAdded.expiresOn", new Object[]{when}, locale)).append('\n');
        }
        body.append('\n');
        body.append(messageSource.getMessage("email.proDaysAdded.howToEarnMore", null, locale)).append("\n\n");
        body.append(messageSource.getMessage("email.proDaysAdded.closing", null, locale));
        try {
            doSend(toEmail, subject, body.toString());
            log.info("Pro days added email sent to {} (days={} source={} locale={})",
                    LogSafe.maskEmail(toEmail), days, source, locale.toLanguageTag());
        } catch (Exception e) {
            log.error("Failed to send pro-days-added email to {}: {}", LogSafe.maskEmail(toEmail), e.getMessage());
        }
    }

    private String greetingFallback(String displayName, Locale locale) {
        if (displayName != null && !displayName.isBlank()) return displayName.trim();
        String tag = locale == null ? SupportedLocales.DEFAULT : locale.getLanguage();
        if ("en".equals(tag)) return "keeper";
        if ("fr".equals(tag)) return "keeper";
        return "amigo arácnido";
    }

    public void sendTrialExpired(String toEmail, String displayName) {
        String greeting = (displayName != null && !displayName.isBlank()) ? displayName : "amigo arácnido";
        try {
            doSend(toEmail,
                "Tu prueba Pro ha finalizado",
                "Hola " + greeting + ",\n\n" +
                "Tu prueba Pro ya finalizó.\n" +
                "Tu cuenta sigue activa en plan FREE y no se realizó ningún cobro automático.\n\n" +
                "Si quieres volver a Pro, puedes activarlo manualmente desde la app.\n\n" +
                "- TarantulApp Team"
            );
            log.info("Trial expired email sent to {}", LogSafe.maskEmail(toEmail));
        } catch (Exception e) {
            log.error("Failed to send trial expired email to {}: {}", LogSafe.maskEmail(toEmail), e.getMessage());
        }
    }

    public void sendProExpired(String toEmail, String displayName) {
        String greeting = (displayName != null && !displayName.isBlank()) ? displayName : "amigo arácnido";
        try {
            doSend(toEmail,
                "Tu plan Pro ha finalizado",
                "Hola " + greeting + ",\n\n" +
                "Tu plan Pro ha finalizado y tu cuenta volvió a FREE.\n\n" +
                "Si quieres reactivar Pro, puedes hacerlo desde la app en cualquier momento.\n\n" +
                "- TarantulApp Team"
            );
            log.info("Pro expired email sent to {}", LogSafe.maskEmail(toEmail));
        } catch (Exception e) {
            log.error("Failed to send pro expired email to {}: {}", LogSafe.maskEmail(toEmail), e.getMessage());
        }
    }

    public void sendProExpiringReminder(String toEmail, String displayName, LocalDateTime currentPeriodEnd) {
        String greeting = (displayName != null && !displayName.isBlank()) ? displayName : "amigo arácnido";
        String endText = currentPeriodEnd != null ? currentPeriodEnd.format(DATE_FMT) : "pronto";
        try {
            doSend(toEmail,
                "Recordatorio: tu suscripción Pro vence pronto",
                "Hola " + greeting + ",\n\n" +
                "Tu suscripción Pro vence pronto.\n" +
                "Fecha estimada de vencimiento: " + endText + ".\n\n" +
                "Puedes revisar o renovar tu plan desde la sección de cuenta en la app.\n\n" +
                "- TarantulApp Team"
            );
            log.info("Pro expiring reminder sent to {}", LogSafe.maskEmail(toEmail));
        } catch (Exception e) {
            log.error("Failed to send pro expiring reminder to {}: {}", LogSafe.maskEmail(toEmail), e.getMessage());
        }
    }

    public void sendPaymentReceipt(String toEmail, String displayName, long amountCents, String currency, String receiptUrl) {
        String greeting = (displayName != null && !displayName.isBlank()) ? displayName : "amigo arácnido";
        String normalizedCurrency = (currency == null || currency.isBlank()) ? "USD" : currency.toUpperCase();
        String amountText = String.format("%.2f %s", amountCents / 100.0, normalizedCurrency);
        String receiptLine = (receiptUrl != null && !receiptUrl.isBlank())
                ? "\nRecibo/factura: " + receiptUrl + "\n"
                : "\n";
        try {
            doSend(toEmail,
                "Recibo de pago TarantulApp Pro",
                "Hola " + greeting + ",\n\n" +
                "Gracias por tu pago de TarantulApp Pro.\n" +
                "Monto: " + amountText + ".\n" +
                receiptLine +
                "Si tienes dudas con tu cobro, responde este correo.\n\n" +
                "- TarantulApp Team"
            );
            log.info("Payment receipt email sent to {}", LogSafe.maskEmail(toEmail));
        } catch (Exception e) {
            log.error("Failed to send payment receipt email to {}: {}", LogSafe.maskEmail(toEmail), e.getMessage());
        }
    }

    public void sendAdminBugReportNotification(
            UUID reportId,
            String reporterEmail,
            String severity,
            String title,
            String currentUrl,
            String appVersion
    ) {
        if (adminNotifyTo == null || adminNotifyTo.isBlank()) return;
        try {
            doSend(adminNotifyTo,
                "[TarantulApp] New beta bug report (" + safe(severity) + ")",
                "New bug report submitted.\n\n" +
                "Report ID: " + reportId + "\n" +
                "Reporter: " + safe(reporterEmail) + "\n" +
                "Severity: " + safe(severity) + "\n" +
                "Title: " + safe(title) + "\n" +
                "Current URL: " + safe(currentUrl) + "\n" +
                "App version: " + safe(appVersion) + "\n\n" +
                "Review in Admin > Bug reports."
            );
            log.info("Admin bug notification sent to {} for report {}", adminNotifyTo, reportId);
        } catch (Exception e) {
            log.error("Failed to send admin bug notification for report {}: {}", reportId, e.getMessage());
        }
    }

    @Async("emailExecutor")
    public void sendAdminBetaApplicationNotification(
            UUID applicationId,
            String email,
            String name,
            String country,
            String level,
            String preferredLocale
    ) {
        if (adminNotifyTo == null || adminNotifyTo.isBlank()) return;
        try {
            doSend(adminNotifyTo,
                "[TarantulApp] New beta application",
                "New beta application received.\n\n" +
                "Application ID: " + applicationId + "\n" +
                "Email: " + safe(email) + "\n" +
                "Name: " + safe(name) + "\n" +
                "Country: " + safe(country) + "\n" +
                "Experience level: " + safe(level) + "\n" +
                "Preferred email language: " + safe(preferredLocale) + "\n\n" +
                "Review in Admin > Beta applications."
            );
            log.info("Admin beta application notification sent to {} for application {}", adminNotifyTo, applicationId);
        } catch (Exception e) {
            log.error("Failed to send admin beta application notification for application {}: {}", applicationId, e.getMessage());
        }
    }

    /**
     * Closed-beta welcome with credentials (same copy as the admin copy/paste templates).
     */
    public void sendBetaWelcomeEmail(String toEmail, String displayName, String plainPassword, String welcomeLocale) {
        String loc = BetaMailBodies.normalizeLocale(welcomeLocale);
        String sendDate = formatBetaSendDateForLocale(loc);
        String body = "en".equals(loc)
                ? BetaMailBodies.welcomeEn(displayName, toEmail, plainPassword, baseUrl, sendDate)
                : BetaMailBodies.welcomeEs(displayName, toEmail, plainPassword, baseUrl, sendDate);
        String subject = BetaMailBodies.welcomeSubject(loc);
        try {
            doSend(toEmail, subject, body);
            log.info("Beta welcome email sent to {} (locale={})", LogSafe.maskEmail(toEmail), loc);
        } catch (Exception e) {
            log.error("Failed to send beta welcome to {}: {}", LogSafe.maskEmail(toEmail), e.getMessage(), e);
            throw new RuntimeException("No se pudo enviar el correo de bienvenida beta: " + e.getMessage());
        }
    }

    public void sendBetaCampaignEmail(String toEmail, String displayName, String campaignKey, String locale) {
        String loc = BetaMailBodies.normalizeLocale(locale);
        if (!BetaMailBodies.isBatchCampaignKey(campaignKey)) {
            throw new IllegalArgumentException("INVALID_BETA_CAMPAIGN_KEY");
        }
        String sendDate = formatBetaSendDateForLocale(loc);
        String body = BetaMailBodies.campaignBody(campaignKey, loc, displayName, baseUrl, sendDate);
        String subject = BetaMailBodies.campaignSubject(campaignKey, loc);
        try {
            doSend(toEmail, subject, body);
            log.info("Beta campaign {} email sent to {} (locale={})", campaignKey, LogSafe.maskEmail(toEmail), loc);
        } catch (Exception e) {
            log.error("Failed beta campaign {} to {}: {}", campaignKey, LogSafe.maskEmail(toEmail), e.getMessage(), e);
            throw new RuntimeException("Fallo al enviar correo de campaña beta: " + e.getMessage());
        }
    }

    private static String formatBetaSendDateForLocale(String loc) {
        var date = LocalDateTime.now().toLocalDate();
        if ("en".equals(loc)) {
            return DateTimeFormatter.ofLocalizedDate(FormatStyle.LONG).withLocale(Locale.UK).format(date);
        }
        return DateTimeFormatter.ofLocalizedDate(FormatStyle.LONG).withLocale(Locale.forLanguageTag("es-MX")).format(date);
    }

    private String safe(String value) {
        return (value == null || value.isBlank()) ? "-" : value;
    }
}
