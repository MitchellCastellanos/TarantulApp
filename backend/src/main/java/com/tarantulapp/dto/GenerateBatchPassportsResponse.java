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

        public GeneratedPassportLine() {}

        public GeneratedPassportLine(java.util.UUID passportId, String shortId, String publicUrl) {
            this.passportId = passportId;
            this.shortId = shortId;
            this.publicUrl = publicUrl;
        }

        public java.util.UUID getPassportId() { return passportId; }
        public void setPassportId(java.util.UUID passportId) { this.passportId = passportId; }
        public String getShortId() { return shortId; }
        public void setShortId(String shortId) { this.shortId = shortId; }
        public String getPublicUrl() { return publicUrl; }
        public void setPublicUrl(String publicUrl) { this.publicUrl = publicUrl; }
    }
}
