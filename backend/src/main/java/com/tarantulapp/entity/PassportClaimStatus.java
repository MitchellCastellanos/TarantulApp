package com.tarantulapp.entity;

/**
 * Claim lifecycle of a passport label.
 *
 * <ul>
 *   <li>{@link #ON_SHELF} — label is publicly visible (shop shelf / vitrine). Scanning shows the
 *       specimen data, but claiming requires the seller's claim code.</li>
 *   <li>{@link #CLAIMABLE} — released for claim: any logged-in keeper can claim (in-hand handoff).</li>
 *   <li>{@link #CLAIMED} — custody taken by a keeper (mirrors {@code claimed_at}).</li>
 *   <li>{@link #VOID} — invalidated by the issuer or an admin (lost, stolen, misprint). Never claimable.</li>
 * </ul>
 */
public enum PassportClaimStatus {
    ON_SHELF,
    CLAIMABLE,
    CLAIMED,
    VOID
}
