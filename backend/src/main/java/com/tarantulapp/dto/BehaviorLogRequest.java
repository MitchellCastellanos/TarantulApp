package com.tarantulapp.dto;

import jakarta.validation.constraints.NotNull;

import java.time.OffsetDateTime;

public class BehaviorLogRequest {

    @NotNull(message = "La fecha del registro es obligatoria")
    private OffsetDateTime loggedAt;

    private String mood;   // calm | defensive | active | hiding | pre_molt
    private String notes;
    private Boolean publishToFeed;

    public OffsetDateTime getLoggedAt() { return loggedAt; }
    public void setLoggedAt(OffsetDateTime loggedAt) { this.loggedAt = loggedAt; }
    public String getMood() { return mood; }
    public void setMood(String mood) { this.mood = mood; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Boolean getPublishToFeed() { return publishToFeed; }
    public void setPublishToFeed(Boolean publishToFeed) { this.publishToFeed = publishToFeed; }
}
