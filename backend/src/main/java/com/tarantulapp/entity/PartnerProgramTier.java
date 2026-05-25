package com.tarantulapp.entity;

public enum PartnerProgramTier {
    /** Curated external business with authorized catalog sync and external checkout handoff. */
    OFFICIAL_PARTNER,
    /** Limited premium official partner slot with stronger placement and co-marketing. */
    FOUNDING_PARTNER,
    /** @deprecated Use {@link #FOUNDING_PARTNER}. Kept for rows created before the ecosystem refactor. */
    @Deprecated
    STRATEGIC_FOUNDER,
    /** @deprecated Use {@link #OFFICIAL_PARTNER}. Kept for rows created before the ecosystem refactor. */
    @Deprecated
    STRATEGIC_PARTNER;

    public boolean isFoundingPartner() {
        return this == FOUNDING_PARTNER || this == STRATEGIC_FOUNDER;
    }

    public boolean isOfficialPartner() {
        return this == OFFICIAL_PARTNER || this == STRATEGIC_PARTNER || isFoundingPartner();
    }
}
