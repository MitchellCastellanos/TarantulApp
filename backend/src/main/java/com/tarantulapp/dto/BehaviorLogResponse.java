package com.tarantulapp.dto;

import com.tarantulapp.entity.BehaviorLog;
import java.time.LocalDateTime;
import java.util.UUID;

public class BehaviorLogResponse {
    private UUID id;
    private UUID tarantulaId;
    private LocalDateTime loggedAt;
    private String mood;
    private String notes;
    private LocalDateTime createdAt;

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
    public LocalDateTime getLoggedAt() { return loggedAt; }
    public String getMood() { return mood; }
    public String getNotes() { return notes; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
