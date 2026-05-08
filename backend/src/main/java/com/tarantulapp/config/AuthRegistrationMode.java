package com.tarantulapp.config;

import java.util.Locale;

/**
 * Registration surface policy:
 * <ul>
 *     <li>invite_only: no self-serve registration (admin-provisioned)</li>
 *     <li>open_limited: self-serve open with rate limits/guardrails</li>
 * </ul>
 */
public enum AuthRegistrationMode {
    INVITE_ONLY("invite_only", false),
    OPEN_LIMITED("open_limited", true);

    private final String wireName;
    private final boolean allowsSelfServeRegistration;

    AuthRegistrationMode(String wireName, boolean allowsSelfServeRegistration) {
        this.wireName = wireName;
        this.allowsSelfServeRegistration = allowsSelfServeRegistration;
    }

    public String wireName() {
        return wireName;
    }

    public boolean allowsSelfServeRegistration() {
        return allowsSelfServeRegistration;
    }

    public static AuthRegistrationMode fromProperty(String raw) {
        String value = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
        if (value.equals(OPEN_LIMITED.wireName)) return OPEN_LIMITED;
        return INVITE_ONLY;
    }
}
