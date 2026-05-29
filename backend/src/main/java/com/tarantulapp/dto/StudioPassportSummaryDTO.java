package com.tarantulapp.dto;

import java.time.Instant;
import java.util.UUID;

public class StudioPassportSummaryDTO {
    private UUID id;
    private String shortId;
    private String publicUrl;
    private boolean claimed;
    private Instant claimedAt;
    private String stage;
    private String sex;

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
    public String getStage() { return stage; }
    public void setStage(String stage) { this.stage = stage; }
    public String getSex() { return sex; }
    public void setSex(String sex) { this.sex = sex; }
}
