package com.tarantulapp.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class GbifSearchResultDTO {

    private Long key;
    private String canonicalName;
    private String scientificName;
    private String family;
    private String vernacularName;
    private String order;
    private String rank;
    private String status;

    public Long getKey() { return key; }
    public void setKey(Long key) { this.key = key; }

    public String getCanonicalName() { return canonicalName; }
    public void setCanonicalName(String canonicalName) { this.canonicalName = canonicalName; }

    public String getScientificName() { return scientificName; }
    public void setScientificName(String scientificName) { this.scientificName = scientificName; }

    public String getFamily() { return family; }
    public void setFamily(String family) { this.family = family; }

    public String getVernacularName() { return vernacularName; }
    public void setVernacularName(String vernacularName) { this.vernacularName = vernacularName; }

    public String getOrder() { return order; }
    public void setOrder(String order) { this.order = order; }

    public String getRank() { return rank; }
    public void setRank(String rank) { this.rank = rank; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
