package com.tarantulapp.dto;

import com.tarantulapp.entity.BehaviorLog;

import java.time.Instant;
import java.util.UUID;

public class BehaviorLogResponse {
    private UUID id;
    private UUID tarantulaId;
    private Instant loggedAt;
    private String mood;
    private String notes;
    private Instant createdAt;

    public static BehaviorLogResponse from(BehaviorLog b) {
        BehaviorLogResponse dto = new BehaviorLogResponse();
        dto.id = b.getId();
        dto.tarantulaId = b.getTarantulaId();
        dto.loggedAt = b.getLoggedAt();
        dto.mood = b.getMood();
        dto.notes = b.getNotes();
        dto.createdAt = b.getCreatedAt();
        return dto;
    }

    public UUID getId() { return id; }
    public UUID getTarantulaId() { return tarantulaId; }
    public Instant getLoggedAt() { return loggedAt; }
    public String getMood() { return mood; }
    public String getNotes() { return notes; }
    public Instant getCreatedAt() { return createdAt; }
}
