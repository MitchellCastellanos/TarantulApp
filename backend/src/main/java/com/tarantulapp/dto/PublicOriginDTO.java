package com.tarantulapp.dto;

/**
 * Public trust signal for Verified Origin. Never includes internal trust scores.
 */
public class PublicOriginDTO {
    private boolean verified;
    private String kind;
    private String displayName;
    private String logoUrl;
    private String logoBwUrl;

    public PublicOriginDTO() {}

    public PublicOriginDTO(boolean verified, String kind, String displayName) {
        this.verified = verified;
        this.kind = kind;
        this.displayName = displayName;
    }

    public PublicOriginDTO(boolean verified, String kind, String displayName, String logoUrl, String logoBwUrl) {
        this.verified = verified;
        this.kind = kind;
        this.displayName = displayName;
        this.logoUrl = logoUrl;
        this.logoBwUrl = logoBwUrl;
    }

    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }
    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }
    public String getLogoBwUrl() { return logoBwUrl; }
    public void setLogoBwUrl(String logoBwUrl) { this.logoBwUrl = logoBwUrl; }
}
