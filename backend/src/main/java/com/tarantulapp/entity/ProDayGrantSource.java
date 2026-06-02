package com.tarantulapp.entity;

/**
 * Origin of a {@link ProDayGrant}. Persisted as the column value (via name()).
 * Mirrored on the frontend gamification breakdown.
 */
public enum ProDayGrantSource {
    REFERRAL_SIGNUP,
    REFERRAL_MILESTONE,
    ADMIN,
    LEGACY_MIGRATION,
    PASSPORT_CLAIM,
    MARKETPLACE_PURCHASE
}
