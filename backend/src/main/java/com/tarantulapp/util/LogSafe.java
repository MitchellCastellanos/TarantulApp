package com.tarantulapp.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * Helpers to keep PII (emails, raw IPs, phone numbers) out of structured logs while still
 * allowing correlation across log lines for the same actor. Emails become {@code local***@domain}
 * (preserves the domain for support triage) and arbitrary strings become {@code SHA-256[:8]}.
 *
 * Use this anywhere we'd otherwise log a raw email or IP — see {@code EmailService},
 * {@code AuthController}, {@code AccountDeletionService}.
 */
public final class LogSafe {

    private LogSafe() {}

    /** {@code "alice@example.com"} → {@code "ali***@example.com"}; null/blank → {@code "<none>"}. */
    public static String maskEmail(String email) {
        if (email == null || email.isBlank()) {
            return "<none>";
        }
        String trimmed = email.trim();
        int at = trimmed.indexOf('@');
        if (at <= 0 || at == trimmed.length() - 1) {
            return "<malformed>";
        }
        String local = trimmed.substring(0, at);
        String domain = trimmed.substring(at + 1);
        String shown = local.length() <= 2 ? local.charAt(0) + "*" : local.substring(0, Math.min(3, local.length())) + "***";
        return shown + "@" + domain;
    }

    /** Stable 8-hex-char fingerprint of an arbitrary string (e.g. an IP). */
    public static String hash(String value) {
        if (value == null || value.isBlank()) return "<none>";
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest).substring(0, 8);
        } catch (NoSuchAlgorithmException e) {
            return "<err>";
        }
    }
}
