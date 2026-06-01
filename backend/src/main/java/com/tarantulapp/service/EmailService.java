package com.tarantulapp.service;

import com.resend.Resend;
import com.resend.services.emails.model.Attachment;
import com.resend.services.emails.model.CreateEmailOptions;
import com.tarantulapp.entity.ProDayGrantSource;
import com.tarantulapp.util.BetaMailBodies;
import com.tarantulapp.util.PartnerOutreachDocuments;
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
import java.net.SocketTimeoutException;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.FormatStyle;
import java.util.Locale;
import java.util.UUID;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final int RESEND_MAX_ATTEMPTS = 3;
    private static final long RESEND_RETRY_BASE_DELAY_MS = 350L;

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

    /** Public scheduling URL for vendor Verified Shop video verification (Cal.com, Calendly, etc.). Optional. */
    @Value("${app.vendor-verification-booking-url:}")
    private String vendorVerificationBookingUrl;

    @Value("${app.mail.admin-notify-to:admin@tarantulapp.com}")
    private String adminNotifyTo;

    public EmailService(JavaMailSender mailSender, MessageSource messageSource) {
        this.mailSender = mailSender;
        this.messageSource = messageSource;
    }

    // ── Core routing ──────────────────────────────────────────────────────────

    public record EmailAttachment(String filename, byte[] content, String contentType) {
    }

    private void doSend(String to, String subject, String text) throws Exception {
        doSend(to, subject, text, null, null);
    }

    private void doSend(String to, String subject, String text, EmailAttachment attachment) throws Exception {
        doSend(to, subject, text, null, attachment);
    }

    private void doSend(String to, String subject, String text, String html, EmailAttachment attachment) throws Exception {
        if (attachment != null && attachment.content() != null && attachment.content().length > 0) {
            if (resendApiKey != null && !resendApiKey.isBlank()) {
                String fromField = fromName + " <" + fromAddress + ">";
                Attachment resendAttachment = Attachment.builder()
                        .fileName(attachment.filename())
                        .content(Base64.getEncoder().encodeToString(attachment.content()))
                        .build();
                var builder = CreateEmailOptions.builder()
                        .from(fromField)
                        .to(to)
                        .subject(subject)
                        .text(text)
                        .attachments(List.of(resendAttachment));
                if (html != null && !html.isBlank()) {
                    builder.html(html);
                }
                sendWithResendRetry(builder.build(), to, subject);
                return;
            }
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromAddress, fromName);
            helper.setTo(to);
            helper.setSubject(subject);
            if (replyToAddress != null && !replyToAddress.isBlank()) {
                helper.setReplyTo(replyToAddress);
            }
            if (html != null && !html.isBlank()) {
                helper.setText(text, html);
            } else {
                helper.setText(text);
            }
            String mime = attachment.contentType() == null || attachment.contentType().isBlank()
                    ? "text/markdown; charset=UTF-8"
                    : attachment.contentType();
            helper.addAttachment(attachment.filename(), () -> new java.io.ByteArrayInputStream(attachment.content()), mime);
            mailSender.send(msg);
            return;
        }
        if (resendApiKey != null && !resendApiKey.isBlank()) {
            String fromField = fromName + " <" + fromAddress + ">";
            var builder = CreateEmailOptions.builder()
                    .from(fromField)
                    .to(to)
                    .subject(subject)
                    .text(text);
            if (html != null && !html.isBlank()) {
                builder.html(html);
            }
            sendWithResendRetry(builder.build(), to, subject);
        } else {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, html != null && !html.isBlank(), "UTF-8");
            helper.setFrom(fromAddress, fromName);
            helper.setTo(to);
            helper.setSubject(subject);
            if (replyToAddress != null && !replyToAddress.isBlank()) {
                helper.setReplyTo(replyToAddress);
            }
            if (html != null && !html.isBlank()) {
                helper.setText(text, html);
            } else {
                helper.setText(text);
            }
            mailSender.send(msg);
        }
    }

    private void sendWithResendRetry(CreateEmailOptions options, String to, String subject) throws Exception {
        Exception last = null;
        for (int attempt = 1; attempt <= RESEND_MAX_ATTEMPTS; attempt++) {
            try {
                Resend resend = new Resend(resendApiKey);
                resend.emails().send(options);
                return;
            } catch (Exception ex) {
                last = ex;
                if (!isRetryableResendFailure(ex) || attempt >= RESEND_MAX_ATTEMPTS) {
                    throw ex;
                }
                long delayMs = RESEND_RETRY_BASE_DELAY_MS * (1L << (attempt - 1));
                log.warn("Resend timeout attempt {}/{} for {} (subject='{}'). Retrying in {}ms",
                        attempt, RESEND_MAX_ATTEMPTS, LogSafe.maskEmail(to), subject, delayMs);
                sleepQuietly(delayMs);
            }
        }
        if (last != null) {
            throw last;
        }
    }

    private static boolean isRetryableResendFailure(Throwable ex) {
        Throwable cursor = ex;
        while (cursor != null) {
            if (cursor instanceof SocketTimeoutException) {
                return true;
            }
            String msg = cursor.getMessage();
            if (msg != null && msg.toLowerCase(Locale.ROOT).contains("timeout")) {
                return true;
            }
            cursor = cursor.getCause();
        }
        return false;
    }

    private static void sleepQuietly(long delayMs) {
        try {
            Thread.sleep(delayMs);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
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

    /** Buyer-facing confirmation for an in-app partner cart order paid inside TarantulApp. */
    public void sendPartnerCartOrderConfirmation(String toEmail, String partnerName, long amountCents,
                                                 String currency, int itemCount, String receiptUrl) {
        sendPartnerCartOrderConfirmation(toEmail, partnerName, amountCents, currency, itemCount, receiptUrl, null, null);
    }

    /** Buyer-facing confirmation for an in-app partner cart order paid inside TarantulApp. */
    public void sendPartnerCartOrderConfirmation(String toEmail, String partnerName, long amountCents,
                                                 String currency, int itemCount, String receiptUrl,
                                                 Map<String, Object> pickupSnapshot, Instant pickupHoldUntil) {
        if (toEmail == null || toEmail.isBlank()) return;
        String normalizedCurrency = (currency == null || currency.isBlank()) ? "CAD" : currency.toUpperCase();
        String amountText = String.format("%.2f %s", amountCents / 100.0, normalizedCurrency);
        String receiptLine = (receiptUrl != null && !receiptUrl.isBlank())
                ? "\nRecibo: " + receiptUrl + "\n"
                : "\n";
        String pickupLine = pickupEmailBlock(pickupSnapshot, pickupHoldUntil, false);
        try {
            doSend(toEmail,
                "Tu compra en " + safe(partnerName) + " — TarantulApp",
                "Gracias por tu compra a través de TarantulApp.\n\n" +
                "Tienda: " + safe(partnerName) + "\n" +
                "Artículos: " + itemCount + "\n" +
                "Total: " + amountText + "\n" +
                receiptLine +
                pickupLine +
                (pickupLine.isBlank()
                        ? "El vendedor coordinará el envío contigo. Si tienes dudas, responde este correo.\n\n"
                        : "Si tienes dudas, responde este correo.\n\n") +
                "- TarantulApp Team"
            );
            log.info("Partner cart order confirmation sent to {}", LogSafe.maskEmail(toEmail));
        } catch (Exception e) {
            log.error("Failed to send partner cart order confirmation to {}: {}", LogSafe.maskEmail(toEmail), e.getMessage());
        }
    }

    /** Partner-facing notification that a buyer paid for their cart inside TarantulApp. */
    public void sendPartnerCartOrderPaid(String toEmail, String partnerName, long amountCents, String currency,
                                         int itemCount, long payoutCents, boolean platformPayout) {
        sendPartnerCartOrderPaid(toEmail, partnerName, amountCents, currency, itemCount, payoutCents, platformPayout, null, null);
    }

    /** Partner-facing notification that a buyer paid for their cart inside TarantulApp. */
    public void sendPartnerCartOrderPaid(String toEmail, String partnerName, long amountCents, String currency,
                                         int itemCount, long payoutCents, boolean platformPayout,
                                         Map<String, Object> pickupSnapshot, Instant pickupHoldUntil) {
        if (toEmail == null || toEmail.isBlank()) return;
        String normalizedCurrency = (currency == null || currency.isBlank()) ? "CAD" : currency.toUpperCase();
        String amountText = String.format("%.2f %s", amountCents / 100.0, normalizedCurrency);
        String payoutLine = platformPayout
                ? "Cobrado por TarantulApp (tienda operada por la app).\n"
                : "Tu liquidación estimada: " + String.format("%.2f %s", payoutCents / 100.0, normalizedCurrency)
                        + " (neto de comisión).\n";
        try {
            doSend(toEmail,
                "Nueva venta en TarantulApp — " + safe(partnerName),
                "Recibiste una venta pagada dentro de TarantulApp.\n\n" +
                "Tienda: " + safe(partnerName) + "\n" +
                "Artículos: " + itemCount + "\n" +
                "Total cobrado: " + amountText + "\n" +
                payoutLine +
                pickupEmailBlock(pickupSnapshot, pickupHoldUntil, true) +
                "Revisa el pedido en tu Partner Hub y coordina el envío o pickup.\n\n" +
                "- TarantulApp Team"
            );
            log.info("Partner cart order paid notification sent to {}", LogSafe.maskEmail(toEmail));
        } catch (Exception e) {
            log.error("Failed to send partner cart order paid notification to {}: {}", LogSafe.maskEmail(toEmail), e.getMessage());
        }
    }

    private String pickupEmailBlock(Map<String, Object> pickupSnapshot, Instant pickupHoldUntil, boolean partnerFacing) {
        if (pickupSnapshot == null || pickupSnapshot.isEmpty()) {
            return "";
        }
        String hold = pickupHoldUntil == null ? "" : "\nRetener hasta: " + pickupHoldUntil;
        String prefix = partnerFacing
                ? "Pickup point seleccionado. El seller/partner sigue siendo responsable si el buyer no llega dentro de la ventana.\n"
                : "Pickup point seleccionado:\n";
        return prefix +
                "Nombre: " + pickupSafe(pickupSnapshot.get("name")) + "\n" +
                "Direccion: " + pickupAddress(pickupSnapshot) + "\n" +
                "Ventana de retencion: " + pickupSafe(pickupSnapshot.get("holdDays")) + " dias" + hold + "\n" +
                (pickupSnapshot.get("publicInstructions") == null ? "" : "Instrucciones: " + pickupSafe(pickupSnapshot.get("publicInstructions")) + "\n") +
                "\n";
    }

    private String pickupAddress(Map<String, Object> pickupSnapshot) {
        return java.util.stream.Stream.of(
                        pickupSnapshot.get("addressLine1"),
                        pickupSnapshot.get("city"),
                        pickupSnapshot.get("state"),
                        pickupSnapshot.get("postalCode"),
                        pickupSnapshot.get("country"))
                .filter(Objects::nonNull)
                .map(this::pickupSafe)
                .filter(s -> !s.isBlank())
                .collect(java.util.stream.Collectors.joining(", "));
    }

    private String pickupSafe(Object value) {
        return value == null ? "" : safe(String.valueOf(value));
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

    /**
     * Alerts the admin that a claimed label has not been confirmed by its issuer within the grace
     * window, so the admin can contact the responsible seller/vendor/partner.
     */
    @Async("emailExecutor")
    public void sendAdminClaimPendingAlert(
            String shortId,
            String issuerName,
            String issuerEmail,
            Instant claimedAt
    ) {
        if (adminNotifyTo == null || adminNotifyTo.isBlank()) return;
        try {
            doSend(adminNotifyTo,
                "[TarantulApp] Claim not confirmed (" + safe(shortId) + ")",
                "A claimed label has not been confirmed by its issuer within 2 hours.\n\n" +
                "Label: " + safe(shortId) + "\n" +
                "Issuer (seller/vendor/partner): " + safe(issuerName) + " <" + safe(issuerEmail) + ">\n" +
                "Claimed at: " + (claimedAt == null ? "" : claimedAt.toString()) + "\n\n" +
                "Please contact the issuer to release/confirm the claim. Review in Admin > Labels."
            );
            log.info("Admin claim-pending alert sent to {} for label {}", adminNotifyTo, shortId);
        } catch (Exception e) {
            log.error("Failed to send admin claim-pending alert for label {}: {}", shortId, e.getMessage());
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
    /**
     * Marketing team onboarding (English). Includes credentials when {@code plainPassword} is set.
     */
    public void sendMarketingTeamWelcomeEmail(String toEmail, String displayName, String plainPassword) {
        String name = displayName == null || displayName.isBlank() ? toEmail : displayName.trim();
        String appUrl = baseUrl == null || baseUrl.isBlank() ? BetaMailBodies.DEFAULT_APP_URL : baseUrl.trim();
        boolean withPassword = plainPassword != null && !plainPassword.isBlank();
        StringBuilder body = new StringBuilder();
        body.append("Hi ").append(name).append(",\n\n");
        body.append("You have been added to the TarantulApp marketing team. ");
        body.append("Your account can use Ad Studio and Partner Outreach tools in the admin area.\n\n");
        if (withPassword) {
            body.append("Sign-in email: ").append(toEmail).append("\n");
            body.append("Temporary password: ").append(plainPassword).append("\n\n");
            body.append("Please sign in and change your password after your first login.\n\n");
        } else {
            body.append("Sign in with your existing TarantulApp credentials at:\n");
            body.append(appUrl).append("\n\n");
        }
        body.append("Marketing hub: ").append(appUrl).append("/admin/marketing\n\n");
        body.append("If you did not expect this invitation, reply to this email.\n\n");
        body.append("— TarantulApp Marketing");
        String subject = "Welcome to the TarantulApp marketing team";
        try {
            doSend(toEmail, subject, body.toString());
            log.info("Marketing team welcome email sent to {}", LogSafe.maskEmail(toEmail));
        } catch (Exception e) {
            log.error("Failed to send marketing team welcome to {}: {}", LogSafe.maskEmail(toEmail), e.getMessage(), e);
            throw new RuntimeException("Could not send marketing team welcome email: " + e.getMessage());
        }
    }

    public void sendBetaWelcomeEmail(String toEmail, String displayName, String plainPassword, String welcomeLocale) {
        String loc = BetaMailBodies.normalizeLocale(welcomeLocale);
        String sendDate = formatBetaSendDateForLocale(loc);
        String body = switch (loc) {
            case "en" -> BetaMailBodies.welcomeEn(displayName, toEmail, plainPassword, baseUrl, sendDate);
            case "fr" -> BetaMailBodies.welcomeFr(displayName, toEmail, plainPassword, baseUrl, sendDate);
            default -> BetaMailBodies.welcomeEs(displayName, toEmail, plainPassword, baseUrl, sendDate);
        };
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
        String body = BetaMailBodies.campaignBody(campaignKey, loc, displayName, baseUrl, sendDate,
                vendorVerificationBookingUrl);
        String subject = BetaMailBodies.campaignSubject(campaignKey, loc);
        try {
            doSend(toEmail, subject, body);
            log.info("Beta campaign {} email sent to {} (locale={})", campaignKey, LogSafe.maskEmail(toEmail), loc);
        } catch (Exception e) {
            log.error("Failed beta campaign {} to {}: {}", campaignKey, LogSafe.maskEmail(toEmail), e.getMessage(), e);
            throw new RuntimeException("Fallo al enviar correo de campaña beta: " + e.getMessage());
        }
    }

    public void sendPartnerCatalogLiveEmail(String toEmail, String partnerName, long listingCount,
                                            String storefrontUrl, String websiteUrl, String locale) {
        sendPartnerCatalogLiveEmail(toEmail, partnerName, listingCount, storefrontUrl, websiteUrl, locale, false);
    }

    public void sendPartnerCatalogLiveEmail(String toEmail, String partnerName, long listingCount,
                                            String storefrontUrl, String websiteUrl, String locale,
                                            boolean attachOnePager) {
        sendPartnerOutreachEmail(toEmail, partnerName, websiteUrl, locale, "partner_catalog_live",
                listingCount, storefrontUrl, attachOnePager);
    }

    public void sendPartnerOutreachIntroEmail(String toEmail, String partnerName, String websiteUrl,
                                              String locale, boolean attachOnePager) {
        sendPartnerOutreachEmail(toEmail, partnerName, websiteUrl, locale, "partner_outreach_intro",
                0L, null, attachOnePager);
    }

    private void sendPartnerOutreachEmail(String toEmail, String partnerName, String websiteUrl, String locale,
                                          String templateKey, long listingCount, String storefrontUrl,
                                          boolean attachOnePager) {
        String loc = BetaMailBodies.normalizeLocale(locale);
        String sendDate = formatBetaSendDateForLocale(loc);
        String appUrl = baseUrl == null || baseUrl.isBlank()
                ? BetaMailBodies.DEFAULT_APP_URL
                : baseUrl.trim();
        String body = "partner_catalog_live".equals(templateKey)
                ? BetaMailBodies.partnerCatalogLiveBody(loc, partnerName, listingCount, storefrontUrl, websiteUrl, sendDate)
                : BetaMailBodies.partnerOutreachIntroBody(loc, partnerName, websiteUrl, sendDate, appUrl);
        String html = "partner_outreach_intro".equals(templateKey)
                ? BetaMailBodies.partnerOutreachIntroHtml(loc, partnerName, websiteUrl, sendDate, appUrl)
                : null;
        String subject = BetaMailBodies.campaignSubject(templateKey, loc);
        EmailAttachment attachment = null;
        if (attachOnePager) {
            attachment = new EmailAttachment(
                    PartnerOutreachDocuments.onePagerAttachmentFilename(loc),
                    PartnerOutreachDocuments.loadOnePagerPdf(loc),
                    PartnerOutreachDocuments.onePagerContentType());
        }
        try {
            doSend(toEmail, subject, body, html, attachment);
            log.info("Partner outreach {} email sent to {} (locale={}, attachment={})",
                    templateKey, LogSafe.maskEmail(toEmail), loc, attachOnePager);
        } catch (Exception e) {
            log.error("Failed partner outreach {} to {}: {}", templateKey, LogSafe.maskEmail(toEmail), e.getMessage(), e);
            throw new RuntimeException("No se pudo enviar correo partner outreach: " + e.getMessage());
        }
    }

    public void sendVendorVerificationSubmitted(String toEmail, String displayName, String locale) {
        String loc = BetaMailBodies.normalizeLocale(locale);
        String hub = baseUrl + "/marketplace/sell";
        try {
            doSend(toEmail,
                    BetaMailBodies.vendorVerificationSubmittedSubject(loc),
                    BetaMailBodies.vendorVerificationSubmittedBody(loc, displayName, hub));
            log.info("Vendor verification submitted email sent to {}", LogSafe.maskEmail(toEmail));
        } catch (Exception e) {
            log.warn("Vendor verification submitted email failed for {}: {}", LogSafe.maskEmail(toEmail), e.getMessage());
        }
    }

    public void sendVendorVerificationApproved(String toEmail, String displayName, String locale) {
        String loc = BetaMailBodies.normalizeLocale(locale);
        try {
            doSend(toEmail,
                    BetaMailBodies.vendorVerificationApprovedSubject(loc),
                    BetaMailBodies.vendorVerificationApprovedBody(loc, displayName, baseUrl + "/marketplace"));
            log.info("Vendor verification approved email sent to {}", LogSafe.maskEmail(toEmail));
        } catch (Exception e) {
            log.warn("Vendor verification approved email failed for {}: {}", LogSafe.maskEmail(toEmail), e.getMessage());
        }
    }

    public void sendAdminCapabilityGrantEmail(String toEmail, String displayName, String locale,
                                              String grantType, long boostCreditsAvailable) {
        String loc = BetaMailBodies.normalizeLocale(locale);
        String name = displayName == null || displayName.isBlank() ? toEmail : displayName.trim();
        String appUrl = baseUrl == null || baseUrl.isBlank() ? BetaMailBodies.DEFAULT_APP_URL : baseUrl.trim();
        String type = grantType == null ? "" : grantType.trim().toLowerCase();
        String subject;
        String body;
        switch (type) {
            case "vendor" -> {
                subject = switch (loc) {
                    case "en" -> "TarantulApp Marketplace - Vendor tools activated";
                    case "fr" -> "TarantulApp Marketplace - Outils Vendor actives";
                    default -> "TarantulApp Marketplace - Herramientas Vendor activadas";
                };
                body = switch (loc) {
                    case "en" -> "Hi " + name + ",\n\n"
                            + "Vendor tools are active on your TarantulApp account. You can publish higher-volume inventory, use all marketplace categories, configure your storefront, and use listing boosts.\n\n"
                            + "Next steps:\n"
                            + "1. Open Seller hub and complete storefront name, handle, shipping policy, LAG/handling policy, and contact method.\n"
                            + "2. Publish or review your listings.\n"
                            + "3. Submit selfie + inventory media from Seller hub when you want the Verified Shop badge.\n\n"
                            + "Seller hub: " + appUrl + "/marketplace/sell\n\n- TarantulApp\n";
                    case "fr" -> "Bonjour " + name + ",\n\n"
                            + "Les outils Vendor sont actifs sur votre compte TarantulApp. Vous pouvez publier plus d'inventaire, utiliser toutes les categories marketplace, configurer votre vitrine et utiliser les boosts.\n\n"
                            + "Prochaines etapes:\n"
                            + "1. Ouvrez le hub vendeur et completez nom de boutique, handle, livraison, politique LAG/manutention et contact.\n"
                            + "2. Publiez ou verifiez vos annonces.\n"
                            + "3. Envoyez selfie + media inventaire depuis le hub pour demander le badge Boutique verifiee.\n\n"
                            + "Hub vendeur: " + appUrl + "/marketplace/sell\n\n- TarantulApp\n";
                    default -> "Hola " + name + ",\n\n"
                            + "Ya tienes activas las herramientas Vendor en TarantulApp. Puedes publicar inventario de mayor volumen, usar todas las categorias del marketplace, configurar tu tienda y usar listing boosts.\n\n"
                            + "Siguientes pasos:\n"
                            + "1. Abre Seller hub y completa nombre de tienda, handle, politica de envio, politica LAG/manejo y contacto.\n"
                            + "2. Publica o revisa tus anuncios.\n"
                            + "3. Sube selfie + material de inventario desde Seller hub cuando quieras el badge Tienda verificada.\n\n"
                            + "Seller hub: " + appUrl + "/marketplace/sell\n\n- TarantulApp\n";
                };
            }
            case "origin" -> {
                subject = switch (loc) {
                    case "en" -> "TarantulApp - Verified Origin approved";
                    case "fr" -> "TarantulApp - Verified Origin approuve";
                    default -> "TarantulApp - Verified Origin aprobado";
                };
                body = switch (loc) {
                    case "en" -> "Hi " + name + ",\n\n"
                            + "Your Verified Origin badge is active. It tells buyers and keepers that TarantulApp reviewed the source behind your animals, passports, or storefront.\n\n"
                            + "Use it by keeping origin notes, locality/captive-bred details, and any permit references accurate on listings and passports.\n\n"
                            + "Open TarantulApp: " + appUrl + "\n\n- TarantulApp\n";
                    case "fr" -> "Bonjour " + name + ",\n\n"
                            + "Votre badge Verified Origin est actif. Il indique que TarantulApp a verifie la source derriere vos animaux, passports ou vitrine.\n\n"
                            + "Gardez les notes d'origine, details captive-bred/localite et references de permis exacts dans les annonces et passports.\n\n"
                            + "Ouvrir TarantulApp: " + appUrl + "\n\n- TarantulApp\n";
                    default -> "Hola " + name + ",\n\n"
                            + "Tu badge Verified Origin ya esta activo. Le comunica a compradores y keepers que TarantulApp reviso la fuente detras de tus animales, passports o tienda.\n\n"
                            + "Usalo manteniendo correctas las notas de origen, detalles captive-bred/localidad y referencias de permisos en listings y passports.\n\n"
                            + "Abrir TarantulApp: " + appUrl + "\n\n- TarantulApp\n";
                };
            }
            case "boost" -> {
                subject = switch (loc) {
                    case "en" -> "TarantulApp Marketplace - Listing boost credits added";
                    case "fr" -> "TarantulApp Marketplace - Credits boost ajoutes";
                    default -> "TarantulApp Marketplace - Creditos de boost agregados";
                };
                body = switch (loc) {
                    case "en" -> "Hi " + name + ",\n\n"
                            + "We added listing boost credits to your account. Available credits now: " + boostCreditsAvailable + ".\n\n"
                            + "Use one when publishing from Seller hub to highlight a listing for 7 days without a Stripe checkout.\n\n"
                            + "Seller hub: " + appUrl + "/marketplace/sell\n\n- TarantulApp\n";
                    case "fr" -> "Bonjour " + name + ",\n\n"
                            + "Nous avons ajoute des credits boost a votre compte. Credits disponibles: " + boostCreditsAvailable + ".\n\n"
                            + "Utilisez-en un lors de la publication depuis le hub vendeur pour mettre une annonce en avant pendant 7 jours sans paiement Stripe.\n\n"
                            + "Hub vendeur: " + appUrl + "/marketplace/sell\n\n- TarantulApp\n";
                    default -> "Hola " + name + ",\n\n"
                            + "Agregamos creditos de listing boost a tu cuenta. Creditos disponibles ahora: " + boostCreditsAvailable + ".\n\n"
                            + "Usa uno al publicar desde Seller hub para resaltar un anuncio por 7 dias sin pasar por Stripe.\n\n"
                            + "Seller hub: " + appUrl + "/marketplace/sell\n\n- TarantulApp\n";
                };
            }
            case "pickup" -> {
                subject = switch (loc) {
                    case "en" -> "TarantulApp Marketplace - Pickup-point access approved";
                    case "fr" -> "TarantulApp Marketplace - Acces aux points de cueillette approuve";
                    default -> "TarantulApp Marketplace - Acceso a pickup points aprobado";
                };
                body = switch (loc) {
                    case "en" -> "Hi " + name + ",\n\n"
                            + "TarantulApp approved your account to use pickup-point fulfillment when it is available for your listings.\n\n"
                            + "Pickup hosts rely on this approval: if a buyer does not collect within the hold window set by that pickup partner, you remain responsible for taking the animal back and coordinating next steps.\n\n"
                            + "Seller hub: " + appUrl + "/marketplace/sell\n\n- TarantulApp\n";
                    case "fr" -> "Bonjour " + name + ",\n\n"
                            + "TarantulApp a approuve votre compte pour utiliser les points de cueillette lorsqu'ils sont disponibles pour vos annonces.\n\n"
                            + "Les points de cueillette s'appuient sur cette approbation: si l'acheteur ne recupere pas l'animal dans la fenetre de garde definie par ce partenaire, vous restez responsable de le reprendre et de coordonner la suite.\n\n"
                            + "Hub vendeur: " + appUrl + "/marketplace/sell\n\n- TarantulApp\n";
                    default -> "Hola " + name + ",\n\n"
                            + "TarantulApp aprobo tu cuenta para usar pickup points cuando esten disponibles en tus listings.\n\n"
                            + "Los pickup hosts confian en esta autorizacion: si el comprador no recoge dentro de la ventana definida por ese pickup partner, tu sigues siendo responsable de pasar por el animalito y coordinar el siguiente paso.\n\n"
                            + "Seller hub: " + appUrl + "/marketplace/sell\n\n- TarantulApp\n";
                };
            }
            default -> throw new IllegalArgumentException("INVALID_GRANT_EMAIL_TYPE");
        }
        try {
            doSend(toEmail, subject, body);
            log.info("Admin capability grant email type={} sent to {}", type, LogSafe.maskEmail(toEmail));
        } catch (Exception e) {
            log.error("Admin capability grant email type={} failed for {}: {}", type, LogSafe.maskEmail(toEmail), e.getMessage(), e);
            throw new RuntimeException("Could not send grant email: " + e.getMessage());
        }
    }

    public void sendVendorVerificationRejected(String toEmail, String displayName, String locale, String reviewerNote) {
        String loc = BetaMailBodies.normalizeLocale(locale);
        try {
            doSend(toEmail,
                    BetaMailBodies.vendorVerificationRejectedSubject(loc),
                    BetaMailBodies.vendorVerificationRejectedBody(loc, displayName, reviewerNote, baseUrl + "/marketplace/sell"));
            log.info("Vendor verification rejected email sent to {}", LogSafe.maskEmail(toEmail));
        } catch (Exception e) {
            log.warn("Vendor verification rejected email failed for {}: {}", LogSafe.maskEmail(toEmail), e.getMessage());
        }
    }

    public void sendAdminVendorVerificationSubmitted(UUID submissionId, String userEmail, String displayName) {
        if (adminNotifyTo == null || adminNotifyTo.isBlank()) {
            return;
        }
        try {
            doSend(adminNotifyTo,
                    "[TarantulApp] Vendor verification pending",
                    "New Verified Shop submission.\n\n"
                            + "Submission ID: " + submissionId + "\n"
                            + "User: " + safe(displayName) + " <" + safe(userEmail) + ">\n\n"
                            + "Review in Admin > Marketplace > Vendor verification queue.");
            log.info("Admin vendor verification notification sent for submission {}", submissionId);
        } catch (Exception e) {
            log.warn("Admin vendor verification notification failed for {}: {}", submissionId, e.getMessage());
        }
    }

    @Async("emailExecutor")
    public void sendAdminPartnerSyncReport(String subject, String body) {
        if (adminNotifyTo == null || adminNotifyTo.isBlank()) {
            return;
        }
        try {
            doSend(adminNotifyTo, subject, body);
            log.info("Admin partner sync report sent to {}", adminNotifyTo);
        } catch (Exception e) {
            log.error("Failed to send admin partner sync report: {}", e.getMessage());
        }
    }

    public void sendVendorInviteEmail(String toEmail, String displayName, String locale, String inviteAbsoluteUrl) {
        String loc = BetaMailBodies.normalizeLocale(locale);
        String sendDate = formatBetaSendDateForLocale(loc);
        String body = BetaMailBodies.vendorInviteBody(loc, displayName, baseUrl, sendDate, inviteAbsoluteUrl,
                vendorVerificationBookingUrl);
        String subject = BetaMailBodies.vendorInviteSubject(loc);
        try {
            doSend(toEmail, subject, body);
            log.info("Vendor invite email sent to {} (locale={})", LogSafe.maskEmail(toEmail), loc);
        } catch (Exception e) {
            log.error("Failed vendor invite to {}: {}", LogSafe.maskEmail(toEmail), e.getMessage(), e);
            throw new RuntimeException("No se pudo enviar la invitación vendor: " + e.getMessage());
        }
    }

    private static String formatBetaSendDateForLocale(String loc) {
        var date = LocalDateTime.now().toLocalDate();
        if ("en".equals(loc)) {
            return DateTimeFormatter.ofLocalizedDate(FormatStyle.LONG).withLocale(Locale.UK).format(date);
        }
        if ("fr".equals(loc)) {
            return DateTimeFormatter.ofLocalizedDate(FormatStyle.LONG).withLocale(Locale.FRANCE).format(date);
        }
        return DateTimeFormatter.ofLocalizedDate(FormatStyle.LONG).withLocale(Locale.forLanguageTag("es-MX")).format(date);
    }

    private String safe(String value) {
        return (value == null || value.isBlank()) ? "-" : value;
    }

    public void sendNewsletterDrops(String toEmail, String displayName, String subject, String body) {
        String greeting = displayName == null || displayName.isBlank() ? "Hola" : "Hola " + displayName;
        String text = greeting + ",\n\n" + body + "\n\n— TarantulApp\n" + baseUrl + "\n";
        try {
            doSend(toEmail, subject, text);
        } catch (Exception e) {
            log.warn("Newsletter send failed for {}: {}", LogSafe.maskEmail(toEmail), e.getMessage());
            throw new RuntimeException("Newsletter send failed", e);
        }
    }

    // ── Specimen transfer (Phase 2) ─────────────────────────────────────────

    private static String transferLoc(String locale) {
        String l = locale == null ? "" : locale.toLowerCase();
        if (l.startsWith("es")) return "es";
        if (l.startsWith("fr")) return "fr";
        return "en";
    }

    /** Offer email to the recipient — they sign in / create an account with this email to accept. */
    public void sendSpecimenTransferOffer(String toEmail, String fromName, String specimenName,
                                          String acceptUrl, String locale) {
        String loc = transferLoc(locale);
        String name = (fromName == null || fromName.isBlank()) ? "A TarantulApp keeper" : fromName;
        String subject;
        String body;
        switch (loc) {
            case "es" -> {
                subject = name + " quiere transferirte una tarántula en TarantulApp";
                body = name + " quiere transferirte “" + specimenName + "”.\n\n"
                        + "Esto es documentación de cambio de custodia: no tiene valor monetario y no se puede "
                        + "deshacer una vez aceptada. No sustituye ningún instrumento legal.\n\n"
                        + "Para aceptar, inicia sesión o crea una cuenta con este correo (" + toEmail
                        + ") y abre tus transferencias:\n" + acceptUrl + "\n\n"
                        + "Bienvenida/o: estás a punto de unirte a la primera comunidad + marketplace + "
                        + "verificación de origen para criadores de tarántulas.\n\n— TarantulApp\n" + baseUrl + "\n";
            }
            case "fr" -> {
                subject = name + " souhaite vous transférer une mygale sur TarantulApp";
                body = name + " souhaite vous transférer « " + specimenName + " ».\n\n"
                        + "Il s'agit d'une documentation de changement de garde : sans valeur monétaire et "
                        + "irréversible une fois acceptée. Cela ne remplace aucun instrument légal.\n\n"
                        + "Pour accepter, connectez-vous ou créez un compte avec cette adresse (" + toEmail
                        + ") et ouvrez vos transferts :\n" + acceptUrl + "\n\n"
                        + "Bienvenue : vous êtes sur le point de rejoindre la première communauté + place de "
                        + "marché + vérification d'origine pour les éleveurs de mygales.\n\n— TarantulApp\n" + baseUrl + "\n";
            }
            default -> {
                subject = name + " wants to transfer a tarantula to you on TarantulApp";
                body = name + " wants to transfer “" + specimenName + "” to you.\n\n"
                        + "This is custody-transfer documentation — it has no monetary value and cannot be "
                        + "undone once accepted. It does not replace any legal instrument.\n\n"
                        + "To accept, sign in or create an account with this email (" + toEmail
                        + ") and open your transfers:\n" + acceptUrl + "\n\n"
                        + "Welcome — you're about to join the first community + marketplace + origin verification "
                        + "for tarantula keepers.\n\n— TarantulApp\n" + baseUrl + "\n";
            }
        }
        try {
            doSend(toEmail, subject, body);
            log.info("Specimen transfer offer sent to {}", LogSafe.maskEmail(toEmail));
        } catch (Exception e) {
            log.warn("Specimen transfer offer failed for {}: {}", LogSafe.maskEmail(toEmail), e.getMessage());
        }
    }

    /** Receipt to the sender confirming a transfer was started. */
    public void sendSpecimenTransferSenderReceipt(String toEmail, String specimenName, String recipientEmail,
                                                  String manageUrl, String locale) {
        String loc = transferLoc(locale);
        String subject;
        String body;
        switch (loc) {
            case "es" -> {
                subject = "Transferencia iniciada: " + specimenName;
                body = "Iniciaste la transferencia de “" + specimenName + "” a " + recipientEmail + ".\n\n"
                        + "Pasará a su colección cuando la acepte. Puedes cancelarla antes de que la acepte "
                        + "desde tu página de transferencias:\n" + manageUrl + "\n\n— TarantulApp\n" + baseUrl + "\n";
            }
            case "fr" -> {
                subject = "Transfert lancé : " + specimenName;
                body = "Vous avez lancé le transfert de « " + specimenName + " » vers " + recipientEmail + ".\n\n"
                        + "Il rejoindra sa collection dès qu'il/elle l'aura accepté. Vous pouvez l'annuler avant "
                        + "l'acceptation depuis votre page de transferts :\n" + manageUrl + "\n\n— TarantulApp\n" + baseUrl + "\n";
            }
            default -> {
                subject = "Transfer started: " + specimenName;
                body = "You started transferring “" + specimenName + "” to " + recipientEmail + ".\n\n"
                        + "It will move to their collection once they accept. You can cancel it before they "
                        + "accept from your transfers page:\n" + manageUrl + "\n\n— TarantulApp\n" + baseUrl + "\n";
            }
        }
        try {
            doSend(toEmail, subject, body);
        } catch (Exception e) {
            log.warn("Specimen transfer receipt failed for {}: {}", LogSafe.maskEmail(toEmail), e.getMessage());
        }
    }

    /** Completion email after a transfer is accepted. {@code toRecipient} picks the perspective. */
    public void sendSpecimenTransferCompleted(String toEmail, String specimenName, String counterparty,
                                              boolean toRecipient, String locale) {
        String loc = transferLoc(locale);
        String other = (counterparty == null || counterparty.isBlank()) ? "the other keeper" : counterparty;
        String subject;
        String body;
        switch (loc) {
            case "es" -> {
                subject = toRecipient ? ("“" + specimenName + "” ya es tuya") : ("Transferencia completada: " + specimenName);
                body = toRecipient
                        ? ("“" + specimenName + "” ya está en tu colección. Es tu documentación de custodia; "
                            + "no sustituye instrumentos legales.\n\n— TarantulApp\n" + baseUrl + "\n")
                        : ("“" + specimenName + "” se transfirió a " + other + " y ya no está en tu colección.\n\n"
                            + "— TarantulApp\n" + baseUrl + "\n");
            }
            case "fr" -> {
                subject = toRecipient ? ("« " + specimenName + " » est maintenant à vous") : ("Transfert terminé : " + specimenName);
                body = toRecipient
                        ? ("« " + specimenName + " » est maintenant dans votre collection. C'est votre documentation "
                            + "de garde ; elle ne remplace pas d'instrument légal.\n\n— TarantulApp\n" + baseUrl + "\n")
                        : ("« " + specimenName + " » a été transférée à " + other + " et n'est plus dans votre "
                            + "collection.\n\n— TarantulApp\n" + baseUrl + "\n");
            }
            default -> {
                subject = toRecipient ? ("“" + specimenName + "” is now yours") : ("Transfer complete: " + specimenName);
                body = toRecipient
                        ? ("“" + specimenName + "” is now in your collection. This is your custody documentation; "
                            + "it does not replace legal instruments.\n\n— TarantulApp\n" + baseUrl + "\n")
                        : ("“" + specimenName + "” was transferred to " + other + " and is no longer in your "
                            + "collection.\n\n— TarantulApp\n" + baseUrl + "\n");
            }
        }
        try {
            doSend(toEmail, subject, body);
        } catch (Exception e) {
            log.warn("Specimen transfer completion failed for {}: {}", LogSafe.maskEmail(toEmail), e.getMessage());
        }
    }
}
