package com.tarantulapp.dto;

import java.util.ArrayList;
import java.util.List;

public class GenerateBatchPassportsResponse {
    private int created;
    private List<GeneratedPassportLine> passports = new ArrayList<>();

    public int getCreated() { return created; }
    public void setCreated(int created) { this.created = created; }
    public List<GeneratedPassportLine> getPassports() { return passports; }
    public void setPassports(List<GeneratedPassportLine> passports) { this.passports = passports; }

    public static class GeneratedPassportLine {
        private java.util.UUID passportId;
        private String shortId;
        private String publicUrl;
        /** Business-held claim code the seller reveals at checkout (ON_SHELF labels). */
        private String claimCode;

        public GeneratedPassportLine() {}

        public GeneratedPassportLine(java.util.UUID passportId, String shortId, String publicUrl) {
            this(passportId, shortId, publicUrl, null);
        }

        public GeneratedPassportLine(java.util.UUID passportId, String shortId, String publicUrl, String claimCode) {
            this.passportId = passportId;
            this.shortId = shortId;
            this.publicUrl = publicUrl;
            this.claimCode = claimCode;
        }

        public java.util.UUID getPassportId() { return passportId; }
        public void setPassportId(java.util.UUID passportId) { this.passportId = passportId; }
        public String getShortId() { return shortId; }
        public void setShortId(String shortId) { this.shortId = shortId; }
        public String getPublicUrl() { return publicUrl; }
        public void setPublicUrl(String publicUrl) { this.publicUrl = publicUrl; }
        public String getClaimCode() { return claimCode; }
        public void setClaimCode(String claimCode) { this.claimCode = claimCode; }
    }
}
