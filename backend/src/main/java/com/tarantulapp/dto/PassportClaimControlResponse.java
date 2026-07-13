package com.tarantulapp.dto;

import java.time.Instant;
import java.util.UUID;

/** Result of an issuer/admin claim-control action (release, hold, void, rotate code). */
public class PassportClaimControlResponse {
    private UUID passportId;
    private String shortId;
    private String claimStatus;
    private String claimCode;
    private Instant claimReleasedAt;

    public PassportClaimControlResponse() {}

    public PassportClaimControlResponse(UUID passportId, String shortId, String claimStatus,
                                        String claimCode, Instant claimReleasedAt) {
        this.passportId = passportId;
        this.shortId = shortId;
        this.claimStatus = claimStatus;
        this.claimCode = claimCode;
        this.claimReleasedAt = claimReleasedAt;
    }

    public UUID getPassportId() { return passportId; }
    public void setPassportId(UUID passportId) { this.passportId = passportId; }
    public String getShortId() { return shortId; }
    public void setShortId(String shortId) { this.shortId = shortId; }
    public String getClaimStatus() { return claimStatus; }
    public void setClaimStatus(String claimStatus) { this.claimStatus = claimStatus; }
    public String getClaimCode() { return claimCode; }
    public void setClaimCode(String claimCode) { this.claimCode = claimCode; }
    public Instant getClaimReleasedAt() { return claimReleasedAt; }
    public void setClaimReleasedAt(Instant claimReleasedAt) { this.claimReleasedAt = claimReleasedAt; }
}
