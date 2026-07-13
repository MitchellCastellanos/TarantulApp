package com.tarantulapp.dto;

import java.time.Instant;
import java.util.UUID;

/** One issued label (passport) with its claim status for the admin drill-down. */
public class AdminLabelRowDTO {
    private UUID passportId;
    private String shortId;
    private String publicUrl;
    private String scientificName;
    private Instant createdAt;
    private Instant claimedAt;
    /** UNCLAIMED | PENDING | CONFIRMED | OVERDUE | VOID */
    private String status;
    /** Traffic light: grey | yellow | green | red */
    private String color;
    /** Claim gate: ON_SHELF | CLAIMABLE | CLAIMED | VOID */
    private String claimStatus;
    /** Business-held claim code (admin support view). */
    private String claimCode;

    public UUID getPassportId() { return passportId; }
    public void setPassportId(UUID passportId) { this.passportId = passportId; }
    public String getShortId() { return shortId; }
    public void setShortId(String shortId) { this.shortId = shortId; }
    public String getPublicUrl() { return publicUrl; }
    public void setPublicUrl(String publicUrl) { this.publicUrl = publicUrl; }
    public String getScientificName() { return scientificName; }
    public void setScientificName(String scientificName) { this.scientificName = scientificName; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getClaimedAt() { return claimedAt; }
    public void setClaimedAt(Instant claimedAt) { this.claimedAt = claimedAt; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
    public String getClaimStatus() { return claimStatus; }
    public void setClaimStatus(String claimStatus) { this.claimStatus = claimStatus; }
    public String getClaimCode() { return claimCode; }
    public void setClaimCode(String claimCode) { this.claimCode = claimCode; }
}
