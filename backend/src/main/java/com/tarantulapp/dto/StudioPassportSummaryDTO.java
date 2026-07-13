package com.tarantulapp.dto;

import java.time.Instant;
import java.util.UUID;

public class StudioPassportSummaryDTO {
    private UUID id;
    private String shortId;
    private String publicUrl;
    private boolean claimed;
    private Instant claimedAt;
    /** ON_SHELF | CLAIMABLE | CLAIMED | VOID */
    private String claimStatus;
    /** Business-held claim code (only visible to the issuer). */
    private String claimCode;
    private Instant claimReleasedAt;
    private String stage;
    private String sex;
    private String labelNotes;
    private UUID batchId;
    private String batchName;
    private String scientificName;
    private String commonName;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getShortId() { return shortId; }
    public void setShortId(String shortId) { this.shortId = shortId; }
    public String getPublicUrl() { return publicUrl; }
    public void setPublicUrl(String publicUrl) { this.publicUrl = publicUrl; }
    public boolean isClaimed() { return claimed; }
    public void setClaimed(boolean claimed) { this.claimed = claimed; }
    public Instant getClaimedAt() { return claimedAt; }
    public void setClaimedAt(Instant claimedAt) { this.claimedAt = claimedAt; }
    public String getClaimStatus() { return claimStatus; }
    public void setClaimStatus(String claimStatus) { this.claimStatus = claimStatus; }
    public String getClaimCode() { return claimCode; }
    public void setClaimCode(String claimCode) { this.claimCode = claimCode; }
    public Instant getClaimReleasedAt() { return claimReleasedAt; }
    public void setClaimReleasedAt(Instant claimReleasedAt) { this.claimReleasedAt = claimReleasedAt; }
    public String getStage() { return stage; }
    public void setStage(String stage) { this.stage = stage; }
    public String getSex() { return sex; }
    public void setSex(String sex) { this.sex = sex; }
    public String getLabelNotes() { return labelNotes; }
    public void setLabelNotes(String labelNotes) { this.labelNotes = labelNotes; }
    public UUID getBatchId() { return batchId; }
    public void setBatchId(UUID batchId) { this.batchId = batchId; }
    public String getBatchName() { return batchName; }
    public void setBatchName(String batchName) { this.batchName = batchName; }
    public String getScientificName() { return scientificName; }
    public void setScientificName(String scientificName) { this.scientificName = scientificName; }
    public String getCommonName() { return commonName; }
    public void setCommonName(String commonName) { this.commonName = commonName; }
}
