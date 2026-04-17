package com.tarantulapp.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class TarantulaResponse {
    private UUID id;
    private String name;
    private BigDecimal currentSizeCm;
    private String stage;
    private String sex;
    private LocalDate purchaseDate;
    private String profilePhoto;
    private String notes;
    private Boolean isPublic;
    private String shortId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private SpeciesDTO species;
    private String status;
    private Instant lastFedAt;
    private Instant lastMoltAt;
    private LocalDateTime deceasedAt;
    private String deathNotes;
    /** True si el plan Free aplica cupo y esta tarántula está fuera de las 6 más antiguas (solo lectura). */
    private boolean locked;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public BigDecimal getCurrentSizeCm() { return currentSizeCm; }
    public void setCurrentSizeCm(BigDecimal currentSizeCm) { this.currentSizeCm = currentSizeCm; }
    public String getStage() { return stage; }
    public void setStage(String stage) { this.stage = stage; }
    public String getSex() { return sex; }
    public void setSex(String sex) { this.sex = sex; }
    public LocalDate getPurchaseDate() { return purchaseDate; }
    public void setPurchaseDate(LocalDate purchaseDate) { this.purchaseDate = purchaseDate; }
    public String getProfilePhoto() { return profilePhoto; }
    public void setProfilePhoto(String profilePhoto) { this.profilePhoto = profilePhoto; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Boolean getIsPublic() { return isPublic; }
    public void setIsPublic(Boolean isPublic) { this.isPublic = isPublic; }
    public String getShortId() { return shortId; }
    public void setShortId(String shortId) { this.shortId = shortId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public SpeciesDTO getSpecies() { return species; }
    public void setSpecies(SpeciesDTO species) { this.species = species; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getLastFedAt() { return lastFedAt; }
    public void setLastFedAt(Instant lastFedAt) { this.lastFedAt = lastFedAt; }
    public Instant getLastMoltAt() { return lastMoltAt; }
    public void setLastMoltAt(Instant lastMoltAt) { this.lastMoltAt = lastMoltAt; }
    public LocalDateTime getDeceasedAt() { return deceasedAt; }
    public void setDeceasedAt(LocalDateTime deceasedAt) { this.deceasedAt = deceasedAt; }
    public String getDeathNotes() { return deathNotes; }
    public void setDeathNotes(String deathNotes) { this.deathNotes = deathNotes; }

    public boolean isLocked() { return locked; }
    public void setLocked(boolean locked) { this.locked = locked; }
}
