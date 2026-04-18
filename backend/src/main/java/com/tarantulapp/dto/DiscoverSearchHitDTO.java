package com.tarantulapp.dto;

/**
 * Unified hit for public discover search (WSC checklist via GBIF, or GBIF backbone in Theraphosidae).
 */
public class DiscoverSearchHitDTO {

    /** "wsc" | "gbif" */
    private String source;
    private Long gbifKey;
    private String canonicalName;
    private String family;

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public Long getGbifKey() { return gbifKey; }
    public void setGbifKey(Long gbifKey) { this.gbifKey = gbifKey; }
    public String getCanonicalName() { return canonicalName; }
    public void setCanonicalName(String canonicalName) { this.canonicalName = canonicalName; }
    public String getFamily() { return family; }
    public void setFamily(String family) { this.family = family; }
}
