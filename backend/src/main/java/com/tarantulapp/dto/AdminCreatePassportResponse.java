package com.tarantulapp.dto;

import java.util.UUID;

public class AdminCreatePassportResponse {
    private UUID passportId;
    private String shortId;
    private String publicUrl;

    public AdminCreatePassportResponse() {}

    public AdminCreatePassportResponse(UUID passportId, String shortId, String publicUrl) {
        this.passportId = passportId;
        this.shortId = shortId;
        this.publicUrl = publicUrl;
    }

    public UUID getPassportId() { return passportId; }
    public void setPassportId(UUID passportId) { this.passportId = passportId; }
    public String getShortId() { return shortId; }
    public void setShortId(String shortId) { this.shortId = shortId; }
    public String getPublicUrl() { return publicUrl; }
    public void setPublicUrl(String publicUrl) { this.publicUrl = publicUrl; }
}
