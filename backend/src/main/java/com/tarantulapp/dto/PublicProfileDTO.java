package com.tarantulapp.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public class PublicProfileDTO {
    private UUID tarantulaId;
    private UUID ownerId;
    /** true si la petición va con JWT del dueño (misma identidad que {@link #ownerId}). */
    private boolean viewerIsOwner;
    /** false cuando el dueño abre su propia ficha privada por QR (sesión con JWT). */
    private Boolean isPublic;
    private String name;
    private String scientificName;
    private String commonName;
    private String stage;
    private String sex;
    private BigDecimal currentSizeCm;
    private String profilePhoto;
    private String habitatType;
    private String status;
    private Instant lastFedAt;
    private Instant lastMoltAt;
    private long spoodCount;
    private boolean spoodedByViewer;

    public UUID getTarantulaId() { return tarantulaId; }
    public void setTarantulaId(UUID tarantulaId) { this.tarantulaId = tarantulaId; }
    public UUID getOwnerId() { return ownerId; }
    public void setOwnerId(UUID ownerId) { this.ownerId = ownerId; }
    public boolean isViewerIsOwner() { return viewerIsOwner; }
    public void setViewerIsOwner(boolean viewerIsOwner) { this.viewerIsOwner = viewerIsOwner; }
    public Boolean getIsPublic() { return isPublic; }
    public void setIsPublic(Boolean isPublic) { this.isPublic = isPublic; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getScientificName() { return scientificName; }
    public void setScientificName(String scientificName) { this.scientificName = scientificName; }
    public String getCommonName() { return commonName; }
    public void setCommonName(String commonName) { this.commonName = commonName; }
    public String getStage() { return stage; }
    public void setStage(String stage) { this.stage = stage; }
    public String getSex() { return sex; }
    public void setSex(String sex) { this.sex = sex; }
    public BigDecimal getCurrentSizeCm() { return currentSizeCm; }
    public void setCurrentSizeCm(BigDecimal currentSizeCm) { this.currentSizeCm = currentSizeCm; }
    public String getProfilePhoto() { return profilePhoto; }
    public void setProfilePhoto(String profilePhoto) { this.profilePhoto = profilePhoto; }
    public String getHabitatType() { return habitatType; }
    public void setHabitatType(String habitatType) { this.habitatType = habitatType; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getLastFedAt() { return lastFedAt; }
    public void setLastFedAt(Instant lastFedAt) { this.lastFedAt = lastFedAt; }
    public Instant getLastMoltAt() { return lastMoltAt; }
    public void setLastMoltAt(Instant lastMoltAt) { this.lastMoltAt = lastMoltAt; }
    public long getSpoodCount() { return spoodCount; }
    public void setSpoodCount(long spoodCount) { this.spoodCount = spoodCount; }
    public boolean isSpoodedByViewer() { return spoodedByViewer; }
    public void setSpoodedByViewer(boolean spoodedByViewer) { this.spoodedByViewer = spoodedByViewer; }
}
