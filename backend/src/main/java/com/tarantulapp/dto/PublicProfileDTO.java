package com.tarantulapp.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public class PublicProfileDTO {

    public enum PageMode {
        PASSPORT,
        SPECIMEN
    }

    /** PASSPORT = unclaimed digital passport; SPECIMEN = claimed collection entry (default for legacy clients). */
    private PageMode pageMode = PageMode.SPECIMEN;
    private String shortId;
    private UUID tarantulaId;
    private UUID ownerId;
    /** true si la petición va con JWT del dueño (misma identidad que {@link #ownerId}). */
    private boolean viewerIsOwner;
    /** false cuando el dueño abre su propia ficha privada por QR (sesión con JWT). */
    private Boolean isPublic;
    private String name;
    private Integer speciesId;
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
    /** Public handle of the keeper, when set; enables a link to their collection. */
    private String keeperHandle;

    /** Passport-only: creator display name when the passport has not been claimed yet. */
    private String creatorDisplayName;
    /** Passport-only: public handle of the passport creator / origin holder. */
    private String creatorHandle;
    /** Passport-only: notes printed on the physical label. */
    private String labelNotes;
    /** Passport-only: Pro days included as a gift when the keeper claims this specimen. */
    private Integer proGiftDays;

    /** Verified Origin of the passport creator or specimen keeper (public trust signal). */
    private PublicOriginDTO origin;

    /** Provenance: public handle of the origin (vendor/breeder) the specimen came from. */
    private String originHandle;
    /** Provenance: display name of the origin the specimen came from. */
    private String originName;
    /** Provenance code: SELF_LOGGED | ISSUED_VERIFIED | ISSUED_UNVERIFIED. */
    private String provenance;

    public String getProvenance() { return provenance; }
    public void setProvenance(String provenance) { this.provenance = provenance; }
    public String getOriginHandle() { return originHandle; }
    public void setOriginHandle(String originHandle) { this.originHandle = originHandle; }
    public String getOriginName() { return originName; }
    public void setOriginName(String originName) { this.originName = originName; }

    public PageMode getPageMode() { return pageMode; }
    public void setPageMode(PageMode pageMode) { this.pageMode = pageMode; }
    public String getShortId() { return shortId; }
    public void setShortId(String shortId) { this.shortId = shortId; }
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
    public Integer getSpeciesId() { return speciesId; }
    public void setSpeciesId(Integer speciesId) { this.speciesId = speciesId; }
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
    public String getKeeperHandle() { return keeperHandle; }
    public void setKeeperHandle(String keeperHandle) { this.keeperHandle = keeperHandle; }
    public String getCreatorDisplayName() { return creatorDisplayName; }
    public void setCreatorDisplayName(String creatorDisplayName) { this.creatorDisplayName = creatorDisplayName; }
    public String getCreatorHandle() { return creatorHandle; }
    public void setCreatorHandle(String creatorHandle) { this.creatorHandle = creatorHandle; }
    public String getLabelNotes() { return labelNotes; }
    public void setLabelNotes(String labelNotes) { this.labelNotes = labelNotes; }
    public Integer getProGiftDays() { return proGiftDays; }
    public void setProGiftDays(Integer proGiftDays) { this.proGiftDays = proGiftDays; }
    public PublicOriginDTO getOrigin() { return origin; }
    public void setOrigin(PublicOriginDTO origin) { this.origin = origin; }
}
