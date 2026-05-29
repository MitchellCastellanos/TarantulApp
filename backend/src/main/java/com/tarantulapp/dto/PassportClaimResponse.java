package com.tarantulapp.dto;

import java.util.UUID;

public class PassportClaimResponse {
    private UUID tarantulaId;
    private String shortId;
    private String name;
    private int proGiftDays;
    private UUID proGrantId;
    private boolean feedingReminderCreated;
    private PublicProfileDTO.PageMode pageMode = PublicProfileDTO.PageMode.SPECIMEN;

    public UUID getTarantulaId() { return tarantulaId; }
    public void setTarantulaId(UUID tarantulaId) { this.tarantulaId = tarantulaId; }
    public String getShortId() { return shortId; }
    public void setShortId(String shortId) { this.shortId = shortId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public int getProGiftDays() { return proGiftDays; }
    public void setProGiftDays(int proGiftDays) { this.proGiftDays = proGiftDays; }
    public UUID getProGrantId() { return proGrantId; }
    public void setProGrantId(UUID proGrantId) { this.proGrantId = proGrantId; }
    public boolean isFeedingReminderCreated() { return feedingReminderCreated; }
    public void setFeedingReminderCreated(boolean feedingReminderCreated) { this.feedingReminderCreated = feedingReminderCreated; }
    public PublicProfileDTO.PageMode getPageMode() { return pageMode; }
    public void setPageMode(PublicProfileDTO.PageMode pageMode) { this.pageMode = pageMode; }
}
