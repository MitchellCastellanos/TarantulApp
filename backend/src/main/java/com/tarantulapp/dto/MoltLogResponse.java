package com.tarantulapp.dto;

import com.tarantulapp.entity.MoltLog;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public class MoltLogResponse {
    private UUID id;
    private UUID tarantulaId;
    private LocalDateTime moltedAt;
    private BigDecimal preSizeCm;
    private BigDecimal postSizeCm;
    private String notes;
    private LocalDateTime createdAt;

    public static MoltLogResponse from(MoltLog m) {
        MoltLogResponse dto = new MoltLogResponse();
        dto.id = m.getId();
        dto.tarantulaId = m.getTarantulaId();
        dto.moltedAt = m.getMoltedAt();
        dto.preSizeCm = m.getPreSizeCm();
        dto.postSizeCm = m.getPostSizeCm();
        dto.notes = m.getNotes();
        dto.createdAt = m.getCreatedAt();
        return dto;
    }

    public UUID getId() { return id; }
    public UUID getTarantulaId() { return tarantulaId; }
    public LocalDateTime getMoltedAt() { return moltedAt; }
    public BigDecimal getPreSizeCm() { return preSizeCm; }
    public BigDecimal getPostSizeCm() { return postSizeCm; }
    public String getNotes() { return notes; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
