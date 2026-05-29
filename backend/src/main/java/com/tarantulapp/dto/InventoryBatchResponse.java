package com.tarantulapp.dto;

import java.time.Instant;
import java.util.UUID;

public class InventoryBatchResponse {
    private UUID id;
    private Integer speciesId;
    private String scientificName;
    private String commonName;
    private String name;
    private int quantityTotal;
    private int quantitySold;
    private int quantityAvailable;
    private long passportsGenerated;
    private long passportsClaimed;
    private long passportsUnclaimed;
    private String notes;
    private Instant createdAt;
    private Instant updatedAt;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Integer getSpeciesId() { return speciesId; }
    public void setSpeciesId(Integer speciesId) { this.speciesId = speciesId; }
    public String getScientificName() { return scientificName; }
    public void setScientificName(String scientificName) { this.scientificName = scientificName; }
    public String getCommonName() { return commonName; }
    public void setCommonName(String commonName) { this.commonName = commonName; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public int getQuantityTotal() { return quantityTotal; }
    public void setQuantityTotal(int quantityTotal) { this.quantityTotal = quantityTotal; }
    public int getQuantitySold() { return quantitySold; }
    public void setQuantitySold(int quantitySold) { this.quantitySold = quantitySold; }
    public int getQuantityAvailable() { return quantityAvailable; }
    public void setQuantityAvailable(int quantityAvailable) { this.quantityAvailable = quantityAvailable; }
    public long getPassportsGenerated() { return passportsGenerated; }
    public void setPassportsGenerated(long passportsGenerated) { this.passportsGenerated = passportsGenerated; }
    public long getPassportsClaimed() { return passportsClaimed; }
    public void setPassportsClaimed(long passportsClaimed) { this.passportsClaimed = passportsClaimed; }
    public long getPassportsUnclaimed() { return passportsUnclaimed; }
    public void setPassportsUnclaimed(long passportsUnclaimed) { this.passportsUnclaimed = passportsUnclaimed; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
