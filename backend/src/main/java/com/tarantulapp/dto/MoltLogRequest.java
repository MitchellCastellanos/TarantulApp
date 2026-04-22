package com.tarantulapp.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public class MoltLogRequest {

    @NotNull(message = "La fecha de muda es obligatoria")
    private OffsetDateTime moltedAt;

    private BigDecimal preSizeCm;
    private BigDecimal postSizeCm;
    private String notes;
    private Boolean publishToFeed;

    public OffsetDateTime getMoltedAt() { return moltedAt; }
    public void setMoltedAt(OffsetDateTime moltedAt) { this.moltedAt = moltedAt; }
    public BigDecimal getPreSizeCm() { return preSizeCm; }
    public void setPreSizeCm(BigDecimal preSizeCm) { this.preSizeCm = preSizeCm; }
    public BigDecimal getPostSizeCm() { return postSizeCm; }
    public void setPostSizeCm(BigDecimal postSizeCm) { this.postSizeCm = postSizeCm; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Boolean getPublishToFeed() { return publishToFeed; }
    public void setPublishToFeed(Boolean publishToFeed) { this.publishToFeed = publishToFeed; }
}
