package com.tarantulapp.dto;

import java.util.UUID;

public class InventoryBatchAdjustmentRequest {
    private Integer deltaSold;
    private Integer deltaTotal;
    private String reason;
    private String notes;
    private UUID passportId;

    public Integer getDeltaSold() { return deltaSold; }
    public void setDeltaSold(Integer deltaSold) { this.deltaSold = deltaSold; }
    public Integer getDeltaTotal() { return deltaTotal; }
    public void setDeltaTotal(Integer deltaTotal) { this.deltaTotal = deltaTotal; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public UUID getPassportId() { return passportId; }
    public void setPassportId(UUID passportId) { this.passportId = passportId; }
}
