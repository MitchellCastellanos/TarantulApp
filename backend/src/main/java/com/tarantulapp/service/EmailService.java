package com.tarantulapp.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:noreply@tarantulapp.com}")
    private String fromAddress;

    @Value("${app.base-url:http://localhost:5173}")
    private String baseUrl;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendPasswordReset(String toEmail, String token) {
        String resetUrl = baseUrl + "/reset-password?token=" + token;
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(fromAddress);
            msg.setTo(toEmail);
            msg.setSubject("TarantulApp — Reset de contraseña / Password Reset");
            msg.setText(
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
}
