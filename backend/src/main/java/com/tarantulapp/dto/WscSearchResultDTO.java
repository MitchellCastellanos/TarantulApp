package com.tarantulapp.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * DTO for results from the World Spider Catalog API.
 * WSC response: { "data": [{ "taxon_id", "name", "family", "author", "year", "status" }] }
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class WscSearchResultDTO {
    private String taxonId;
    private String name;         // canonical scientific name
    private String family;
    private String author;
    private String year;
    private String status;       // "accepted" | "synonym" etc.

    public String getTaxonId() { return taxonId; }
    public void setTaxonId(String taxonId) { this.taxonId = taxonId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getFamily() { return family; }
    public void setFamily(String family) { this.family = family; }
    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }
    public String getYear() { return year; }
    public void setYear(String year) { this.year = year; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
