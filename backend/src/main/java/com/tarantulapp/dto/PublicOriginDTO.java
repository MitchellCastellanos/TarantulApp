package com.tarantulapp.dto;

/**
 * Public trust signal for Verified Origin. Never includes internal trust scores.
 */
public class PublicOriginDTO {
    private boolean verified;
    private String kind;
    private String displayName;

    public PublicOriginDTO() {}

    public PublicOriginDTO(boolean verified, String kind, String displayName) {
        this.verified = verified;
        this.kind = kind;
        this.displayName = displayName;
    }

    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }
    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
}
