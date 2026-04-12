package com.tarantulapp.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class MoltLogRequest {

    @NotNull(message = "La fecha de muda es obligatoria")
    private LocalDateTime moltedAt;

    private BigDecimal preSizeCm;
    private BigDecimal postSizeCm;
    private String notes;

    public LocalDateTime getMoltedAt() { return moltedAt; }
    public void setMoltedAt(LocalDateTime moltedAt) { this.moltedAt = moltedAt; }
    public BigDecimal getPreSizeCm() { return preSizeCm; }
    public void setPreSizeCm(BigDecimal preSizeCm) { this.preSizeCm = preSizeCm; }
    public BigDecimal getPostSizeCm() { return postSizeCm; }
    public void setPostSizeCm(BigDecimal postSizeCm) { this.postSizeCm = postSizeCm; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
