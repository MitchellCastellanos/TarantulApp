package com.tarantulapp.dto;

import jakarta.validation.constraints.NotNull;

import java.time.OffsetDateTime;

public class FeedingLogRequest {

    @NotNull(message = "La fecha de alimentación es obligatoria")
    private OffsetDateTime fedAt;

    private String preyType;
    private String preySize;
    private Integer quantity;
    private Boolean accepted;
    private String notes;
    private Boolean publishToFeed;

    public OffsetDateTime getFedAt() { return fedAt; }
    public void setFedAt(OffsetDateTime fedAt) { this.fedAt = fedAt; }
    public String getPreyType() { return preyType; }
    public void setPreyType(String preyType) { this.preyType = preyType; }
    public String getPreySize() { return preySize; }
    public void setPreySize(String preySize) { this.preySize = preySize; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    public Boolean getAccepted() { return accepted; }
    public void setAccepted(Boolean accepted) { this.accepted = accepted; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Boolean getPublishToFeed() { return publishToFeed; }
    public void setPublishToFeed(Boolean publishToFeed) { this.publishToFeed = publishToFeed; }
}
