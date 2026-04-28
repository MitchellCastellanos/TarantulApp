package com.tarantulapp.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.mail.javamail.MimeMessageHelper;

import jakarta.mail.internet.MimeMessage;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:noreply@tarantulapp.com}")
    private String fromAddress;

    @Value("${app.mail.from-name:TarantulApp}")
    private String fromName;

    @Value("${app.mail.reply-to:}")
    private String replyToAddress;

    @Value("${app.base-url:http://localhost:5173}")
    private String baseUrl;

    @Value("${app.mail.admin-notify-to:admin@tarantulapp.com}")
    private String adminNotifyTo;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendPasswordReset(String toEmail, String token) {
        String resetUrl = baseUrl + "/reset-password?token=" + token;
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, "UTF-8");
            helper.setFrom(fromAddress, fromName);
            helper.setTo(toEmail);
            helper.setSubject("TarantulApp — Reset de contraseña / Password Reset");
            if (replyToAddress != null && !replyToAddress.isBlank()) {
                helper.setReplyTo(replyToAddress);
            }
            helper.setText(
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
            mailSender.send(msg);
            log.info("Password reset email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send reset email to {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("No se pudo enviar el correo de reseteo");
        }
    }

    public void sendWelcomeTrialStarted(String toEmail, String displayName, LocalDateTime trialEndsAt) {
        String greeting = (displayName != null && !displayName.isBlank()) ? displayName : "amigo arácnido";
        String trialEndsText = trialEndsAt != null ? trialEndsAt.format(DATE_FMT) : "en 7 días";
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, "UTF-8");
            helper.setFrom(fromAddress, fromName);
            helper.setTo(toEmail);
            helper.setSubject("Bienvenido a TarantulApp - Tu prueba Pro empezó");
            if (replyToAddress != null && !replyToAddress.isBlank()) {
                helper.setReplyTo(replyToAddress);
            }
            helper.setText(
                "Hola " + greeting + ",\n\n" +
                "Bienvenido a TarantulApp. Tu prueba gratuita Pro ya está activa.\n" +
                "Finaliza el: " + trialEndsText + ".\n\n" +
                "Importante: NO te vamos a cobrar automaticamente al terminar la prueba.\n" +
                "Solo te enviaremos un recordatorio 2 días antes para avisarte.\n\n" +
                "Si quieres ayuda, responde este correo.\n\n" +
                "- TarantulApp Team"
            );
            mailSender.send(msg);
            log.info("Welcome trial email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send welcome/trial email to {}: {}", toEmail, e.getMessage());
        }
    }

    public void sendTrialEndingReminder(String toEmail, String displayName, LocalDateTime trialEndsAt) {
        String greeting = (displayName != null && !displayName.isBlank()) ? displayName : "amigo arácnido";
        String trialEndsText = trialEndsAt != null ? trialEndsAt.format(DATE_FMT) : "pronto";
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, "UTF-8");
            helper.setFrom(fromAddress, fromName);
            helper.setTo(toEmail);
            helper.setSubject("Recordatorio: tu prueba Pro termina en 2 días");
            if (replyToAddress != null && !replyToAddress.isBlank()) {
                helper.setReplyTo(replyToAddress);
            }
            helper.setText(
                "Hola " + greeting + ",\n\n" +
                "Te recordamos que tu prueba Pro termina en 2 días.\n" +
                "Fecha de fin: " + trialEndsText + ".\n\n" +
                "No hay cobro automático al finalizar la prueba.\n" +
                "Si quieres continuar en Pro, puedes activarlo manualmente desde la app.\n\n" +
                "- TarantulApp Team"
            );
            mailSender.send(msg);
            log.info("Trial ending reminder sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send trial reminder to {}: {}", toEmail, e.getMessage());
        }
    }

    public void sendProActivated(String toEmail, String displayName) {
        String greeting = (displayName != null && !displayName.isBlank()) ? displayName : "amigo arácnido";
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, "UTF-8");
            helper.setFrom(fromAddress, fromName);
            helper.setTo(toEmail);
            helper.setSubject("Pro activado - Gracias por apoyar TarantulApp");
            if (replyToAddress != null && !replyToAddress.isBlank()) {
                helper.setReplyTo(replyToAddress);
            }
            helper.setText(
                "Hola " + greeting + ",\n\n" +
                "Tu plan Pro ya está activo.\n" +
                "Gracias por apoyar TarantulApp.\n\n" +
                "Si necesitas ayuda con tu suscripción, responde este correo.\n\n" +
                "- TarantulApp Team"
            );
            mailSender.send(msg);
            log.info("Pro activation email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send pro activation email to {}: {}", toEmail, e.getMessage());
        }
    }

    public void sendTrialExpired(String toEmail, String displayName) {
        String greeting = (displayName != null && !displayName.isBlank()) ? displayName : "amigo arácnido";
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, "UTF-8");
            helper.setFrom(fromAddress, fromName);
            helper.setTo(toEmail);
            helper.setSubject("Tu prueba Pro ha finalizado");
            if (replyToAddress != null && !replyToAddress.isBlank()) {
                helper.setReplyTo(replyToAddress);
            }
            helper.setText(
                "Hola " + greeting + ",\n\n" +
                "Tu prueba Pro ya finalizó.\n" +
                "Tu cuenta sigue activa en plan FREE y no se realizó ningún cobro automático.\n\n" +
                "Si quieres volver a Pro, puedes activarlo manualmente desde la app.\n\n" +
                "- TarantulApp Team"
            );
            mailSender.send(msg);
            log.info("Trial expired email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send trial expired email to {}: {}", toEmail, e.getMessage());
        }
    }

    public void sendProExpired(String toEmail, String displayName) {
        String greeting = (displayName != null && !displayName.isBlank()) ? displayName : "amigo arácnido";
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, "UTF-8");
            helper.setFrom(fromAddress, fromName);
            helper.setTo(toEmail);
            helper.setSubject("Tu plan Pro ha finalizado");
            if (replyToAddress != null && !replyToAddress.isBlank()) {
                helper.setReplyTo(replyToAddress);
            }
            helper.setText(
                "Hola " + greeting + ",\n\n" +
                "Tu plan Pro ha finalizado y tu cuenta volvió a FREE.\n\n" +
                "Si quieres reactivar Pro, puedes hacerlo desde la app en cualquier momento.\n\n" +
                "- TarantulApp Team"
            );
            mailSender.send(msg);
            log.info("Pro expired email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send pro expired email to {}: {}", toEmail, e.getMessage());
        }
    }

    public void sendProExpiringReminder(String toEmail, String displayName, LocalDateTime currentPeriodEnd) {
        String greeting = (displayName != null && !displayName.isBlank()) ? displayName : "amigo arácnido";
        String endText = currentPeriodEnd != null ? currentPeriodEnd.format(DATE_FMT) : "pronto";
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, "UTF-8");
            helper.setFrom(fromAddress, fromName);
            helper.setTo(toEmail);
            helper.setSubject("Recordatorio: tu suscripción Pro vence pronto");
            if (replyToAddress != null && !replyToAddress.isBlank()) {
                helper.setReplyTo(replyToAddress);
            }
            helper.setText(
                "Hola " + greeting + ",\n\n" +
                "Tu suscripción Pro vence pronto.\n" +
                "Fecha estimada de vencimiento: " + endText + ".\n\n" +
                "Puedes revisar o renovar tu plan desde la sección de cuenta en la app.\n\n" +
                "- TarantulApp Team"
            );
            mailSender.send(msg);
            log.info("Pro expiring reminder sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send pro expiring reminder to {}: {}", toEmail, e.getMessage());
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
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, "UTF-8");
            helper.setFrom(fromAddress, fromName);
            helper.setTo(toEmail);
            helper.setSubject("Recibo de pago TarantulApp Pro");
            if (replyToAddress != null && !replyToAddress.isBlank()) {
                helper.setReplyTo(replyToAddress);
            }
            helper.setText(
                "Hola " + greeting + ",\n\n" +
                "Gracias por tu pago de TarantulApp Pro.\n" +
                "Monto: " + amountText + ".\n" +
                receiptLine +
                "Si tienes dudas con tu cobro, responde este correo.\n\n" +
                "- TarantulApp Team"
            );
            mailSender.send(msg);
            log.info("Payment receipt email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send payment receipt email to {}: {}", toEmail, e.getMessage());
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
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, "UTF-8");
            helper.setFrom(fromAddress, fromName);
            helper.setTo(adminNotifyTo);
            helper.setSubject("[TarantulApp] New beta bug report (" + safe(severity) + ")");
            if (replyToAddress != null && !replyToAddress.isBlank()) {
                helper.setReplyTo(replyToAddress);
            }
            helper.setText(
                "New bug report submitted.\n\n" +
                "Report ID: " + String.valueOf(reportId) + "\n" +
                "Reporter: " + safe(reporterEmail) + "\n" +
                "Severity: " + safe(severity) + "\n" +
                "Title: " + safe(title) + "\n" +
                "Current URL: " + safe(currentUrl) + "\n" +
                "App version: " + safe(appVersion) + "\n\n" +
                "Review in Admin > Bug reports."
            );
            mailSender.send(msg);
            log.info("Admin bug notification sent to {} for report {}", adminNotifyTo, reportId);
        } catch (Exception e) {
            log.error("Failed to send admin bug notification for report {}: {}", reportId, e.getMessage());
        }
    }

    public void sendAdminBetaApplicationNotification(
            UUID applicationId,
            String email,
            String name,
            String country,
            String level
    ) {
        if (adminNotifyTo == null || adminNotifyTo.isBlank()) return;
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, "UTF-8");
            helper.setFrom(fromAddress, fromName);
            helper.setTo(adminNotifyTo);
            helper.setSubject("[TarantulApp] New beta application");
            if (replyToAddress != null && !replyToAddress.isBlank()) {
                helper.setReplyTo(replyToAddress);
            }
            helper.setText(
                "New beta application received.\n\n" +
                "Application ID: " + String.valueOf(applicationId) + "\n" +
                "Email: " + safe(email) + "\n" +
                "Name: " + safe(name) + "\n" +
                "Country: " + safe(country) + "\n" +
                "Experience level: " + safe(level) + "\n\n" +
                "Review in Admin > Beta applications."
            );
            mailSender.send(msg);
            log.info("Admin beta application notification sent to {} for application {}", adminNotifyTo, applicationId);
        } catch (Exception e) {
            log.error("Failed to send admin beta application notification for application {}: {}", applicationId, e.getMessage());
        }
    }

    private String safe(String value) {
        return (value == null || value.isBlank()) ? "-" : value;
    }
}
