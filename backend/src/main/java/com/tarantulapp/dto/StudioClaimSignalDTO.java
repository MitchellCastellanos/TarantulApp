package com.tarantulapp.dto;

import java.time.Instant;
import java.util.UUID;

public class StudioClaimSignalDTO {
    private UUID eventId;
    private UUID passportId;
    private String shortId;
    private Instant claimedAt;
    private boolean handled;

    public UUID getEventId() { return eventId; }
    public void setEventId(UUID eventId) { this.eventId = eventId; }
    public UUID getPassportId() { return passportId; }
    public void setPassportId(UUID passportId) { this.passportId = passportId; }
    public String getShortId() { return shortId; }
    public void setShortId(String shortId) { this.shortId = shortId; }
    public Instant getClaimedAt() { return claimedAt; }
    public void setClaimedAt(Instant claimedAt) { this.claimedAt = claimedAt; }
    public boolean isHandled() { return handled; }
    public void setHandled(boolean handled) { this.handled = handled; }
}
