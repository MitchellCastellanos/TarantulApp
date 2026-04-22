package com.tarantulapp.util;

/**
 * Normalization rules for {@code public_handle}, aligned with {@link com.tarantulapp.service.MarketplaceService}:
 * lowercase, digits and {@code ._-} only, max length {@link #MAX_LEN}.
 */
public final class PublicHandleRules {

    public static final int MAX_LEN = 60;
    public static final int MIN_LEN = 3;

    private PublicHandleRules() {
    }

    /**
     * @param raw plain text or {@code @handle}; null if empty after normalization
     */
    public static String normalize(String raw) {
        if (raw == null) {
            return null;
        }
        String t = raw.trim();
        if (t.startsWith("@")) {
            t = t.substring(1).trim();
        }
        if (t.isBlank()) {
            return null;
        }
        t = t.replaceAll("\\s+", " ").trim();
        if (t.isBlank()) {
            return null;
        }
        t = t.toLowerCase().replaceAll("[^a-z0-9._-]", "");
        if (t.isBlank()) {
            return null;
        }
        return t.length() > MAX_LEN ? t.substring(0, MAX_LEN) : t;
    }

    public static boolean isReserved(String handle) {
        if (handle == null || handle.isBlank()) {
            return true;
        }
        String h = handle.toLowerCase();
        return switch (h) {
            case "admin", "administrator", "support", "help", "system", "root", "api",
                 "tarantulapp", "moderator", "mod", "staff", "official" -> true;
            default -> false;
        };
    }
}
