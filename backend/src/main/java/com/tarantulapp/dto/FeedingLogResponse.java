package com.tarantulapp.dto;

import com.tarantulapp.entity.FeedingLog;

import java.time.Instant;
import java.util.UUID;

public class FeedingLogResponse {
    private UUID id;
    private UUID tarantulaId;
    private Instant fedAt;
    private String preyType;
    private String preySize;
    private Integer quantity;
    private Boolean accepted;
    private String notes;
    private Instant createdAt;

    public static FeedingLogResponse from(FeedingLog f) {
        FeedingLogResponse dto = new FeedingLogResponse();
        dto.id = f.getId();
        dto.tarantulaId = f.getTarantulaId();
        dto.fedAt = f.getFedAt();
        dto.preyType = f.getPreyType();
        dto.preySize = f.getPreySize();
        dto.quantity = f.getQuantity();
        dto.accepted = f.getAccepted();
        dto.notes = f.getNotes();
        dto.createdAt = f.getCreatedAt();
        return dto;
    }

    public UUID getId() { return id; }
    public UUID getTarantulaId() { return tarantulaId; }
    public Instant getFedAt() { return fedAt; }
    public String getPreyType() { return preyType; }
    public String getPreySize() { return preySize; }
    public Integer getQuantity() { return quantity; }
    public Boolean getAccepted() { return accepted; }
    public String getNotes() { return notes; }
    public Instant getCreatedAt() { return createdAt; }
}
