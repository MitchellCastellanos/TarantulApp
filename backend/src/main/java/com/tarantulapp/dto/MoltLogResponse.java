package com.tarantulapp.dto;

import com.tarantulapp.entity.MoltLog;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public class MoltLogResponse {
    private UUID id;
    private UUID tarantulaId;
    private Instant moltedAt;
    private BigDecimal preSizeCm;
    private BigDecimal postSizeCm;
    private String notes;
    private Boolean successful;
    private String complicationType;
    private Integer durationMinutes;
    private String preMoltSigns;
    private Instant createdAt;

    public static MoltLogResponse from(MoltLog m) {
        MoltLogResponse dto = new MoltLogResponse();
        dto.id = m.getId();
        dto.tarantulaId = m.getTarantulaId();
        dto.moltedAt = m.getMoltedAt();
        dto.preSizeCm = m.getPreSizeCm();
        dto.postSizeCm = m.getPostSizeCm();
        dto.notes = m.getNotes();
        dto.successful = m.getSuccessful();
        dto.complicationType = m.getComplicationType();
        dto.durationMinutes = m.getDurationMinutes();
        dto.preMoltSigns = m.getPreMoltSigns();
        dto.createdAt = m.getCreatedAt();
        return dto;
    }

    public UUID getId() { return id; }
    public UUID getTarantulaId() { return tarantulaId; }
    public Instant getMoltedAt() { return moltedAt; }
    public BigDecimal getPreSizeCm() { return preSizeCm; }
    public BigDecimal getPostSizeCm() { return postSizeCm; }
    public String getNotes() { return notes; }
    public Boolean getSuccessful() { return successful; }
    public String getComplicationType() { return complicationType; }
    public Integer getDurationMinutes() { return durationMinutes; }
    public String getPreMoltSigns() { return preMoltSigns; }
    public Instant getCreatedAt() { return createdAt; }
}
