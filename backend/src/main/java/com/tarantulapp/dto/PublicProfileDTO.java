package com.tarantulapp.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class PublicProfileDTO {
    private String name;
    private String scientificName;
    private String commonName;
    private String stage;
    private String sex;
    private BigDecimal currentSizeCm;
    private String profilePhoto;
    private String habitatType;
    private String status;
    private LocalDateTime lastFedAt;
    private LocalDateTime lastMoltAt;

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
    public LocalDateTime getLastFedAt() { return lastFedAt; }
    public void setLastFedAt(LocalDateTime lastFedAt) { this.lastFedAt = lastFedAt; }
    public LocalDateTime getLastMoltAt() { return lastMoltAt; }
    public void setLastMoltAt(LocalDateTime lastMoltAt) { this.lastMoltAt = lastMoltAt; }
}
