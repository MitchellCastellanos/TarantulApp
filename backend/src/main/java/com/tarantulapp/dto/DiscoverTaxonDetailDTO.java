package com.tarantulapp.dto;

/**
 * Read-only taxon sheet for public discover (GBIF + resolved photo).
 */
public class DiscoverTaxonDetailDTO {

    private Long gbifKey;
    private String canonicalName;
    private String scientificName;
    private String family;
    private String rank;
    private String taxonomicStatus;
    private String vernacularName;
    private DiscoverPhotoDTO photo;
    private String dataAttributionNote;

    public Long getGbifKey() { return gbifKey; }
    public void setGbifKey(Long gbifKey) { this.gbifKey = gbifKey; }
    public String getCanonicalName() { return canonicalName; }
    public void setCanonicalName(String canonicalName) { this.canonicalName = canonicalName; }
    public String getScientificName() { return scientificName; }
    public void setScientificName(String scientificName) { this.scientificName = scientificName; }
    public String getFamily() { return family; }
    public void setFamily(String family) { this.family = family; }
    public String getRank() { return rank; }
    public void setRank(String rank) { this.rank = rank; }
    public String getTaxonomicStatus() { return taxonomicStatus; }
    public void setTaxonomicStatus(String taxonomicStatus) { this.taxonomicStatus = taxonomicStatus; }
    public String getVernacularName() { return vernacularName; }
    public void setVernacularName(String vernacularName) { this.vernacularName = vernacularName; }
    public DiscoverPhotoDTO getPhoto() { return photo; }
    public void setPhoto(DiscoverPhotoDTO photo) { this.photo = photo; }
    public String getDataAttributionNote() { return dataAttributionNote; }
    public void setDataAttributionNote(String dataAttributionNote) { this.dataAttributionNote = dataAttributionNote; }
}
