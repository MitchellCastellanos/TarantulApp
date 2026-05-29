package com.tarantulapp.entity;

import java.util.Locale;

public enum VerifiedOriginKind {
    BREEDER,
    STORE,
    VENDOR,
    SELLER;

    public static VerifiedOriginKind fromString(String raw) {
        if (raw == null || raw.isBlank()) {
            return SELLER;
        }
        try {
            return VerifiedOriginKind.valueOf(raw.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return SELLER;
        }
    }
}
