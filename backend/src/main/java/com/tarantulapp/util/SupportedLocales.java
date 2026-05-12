package com.tarantulapp.util;

import jakarta.servlet.http.HttpServletRequest;

import java.util.Locale;
import java.util.Set;

/**
 * Single source of truth for transactional-email locales. Mirrors the frontend i18n bundles.
 * Default is Spanish to match the app's primary user base; English/French are explicit opt-ins.
 */
public final class SupportedLocales {

    public static final String DEFAULT = "es";
    public static final Set<String> SUPPORTED = Set.of("es", "en", "fr");

    private SupportedLocales() {}

    /** Picks the first supported tag from an Accept-Language header; falls back to {@link #DEFAULT}. */
    public static String fromAcceptLanguage(String headerValue) {
        if (headerValue == null || headerValue.isBlank()) {
            return DEFAULT;
        }
        for (String token : headerValue.split(",")) {
            String tag = token;
            int semi = tag.indexOf(';');
            if (semi >= 0) tag = tag.substring(0, semi);
            tag = tag.trim();
            if (tag.isEmpty()) continue;
            int dash = tag.indexOf('-');
            String primary = (dash >= 0 ? tag.substring(0, dash) : tag).toLowerCase(Locale.ROOT);
            if (SUPPORTED.contains(primary)) {
                return primary;
            }
        }
        return DEFAULT;
    }

    public static String fromRequest(HttpServletRequest request) {
        if (request == null) return DEFAULT;
        return fromAcceptLanguage(request.getHeader("Accept-Language"));
    }

    /** Normalizes any candidate (DB value, payload field) to a supported tag, defaulting if unsupported/null. */
    public static String normalize(String candidate) {
        if (candidate == null) return DEFAULT;
        String trimmed = candidate.trim().toLowerCase(Locale.ROOT);
        if (trimmed.isEmpty()) return DEFAULT;
        int dash = trimmed.indexOf('-');
        String primary = dash >= 0 ? trimmed.substring(0, dash) : trimmed;
        return SUPPORTED.contains(primary) ? primary : DEFAULT;
    }

    /** Maps to {@link Locale} for {@link org.springframework.context.MessageSource} lookups. */
    public static Locale toLocale(String tag) {
        return Locale.forLanguageTag(normalize(tag));
    }
}
