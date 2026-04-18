package com.tarantulapp.dto;

/**
 * Reference image for discover views, with attribution for iNaturalist / GBIF.
 */
public class DiscoverPhotoDTO {

    private String url;
    /** "inat" | "gbif" | null if none */
    private String source;
    private String attribution;
    private String licenseCode;
    private String taxonPageUrl;

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public String getAttribution() { return attribution; }
    public void setAttribution(String attribution) { this.attribution = attribution; }
    public String getLicenseCode() { return licenseCode; }
    public void setLicenseCode(String licenseCode) { this.licenseCode = licenseCode; }
    public String getTaxonPageUrl() { return taxonPageUrl; }
    public void setTaxonPageUrl(String taxonPageUrl) { this.taxonPageUrl = taxonPageUrl; }
}
