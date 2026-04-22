package com.tarantulapp.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class AuthResponse {

    private String token;
    private String email;
    private String displayName;
    private UUID userId;
    private String plan;
    private LocalDateTime trialEndsAt;
    private boolean readOnly;
    private boolean inTrial;
    private boolean overFreeLimit;
    private boolean strictReadOnly;
    private String publicHandle;
    private String bio;
    private String location;
    private String featuredCollection;
    private String contactWhatsapp;
    private String contactInstagram;
    private String profileCountry;
    private String profileState;
    private String profileCity;
    private Integer qrPrintExports;
    private String profilePhoto;
    private boolean admin;

    public AuthResponse(String token, String email, String displayName, UUID userId, String plan) {
        this.token = token;
        this.email = email;
        this.displayName = displayName;
        this.userId = userId;
        this.plan = plan;
    }

    public String getToken() { return token; }
    public String getEmail() { return email; }
    public String getDisplayName() { return displayName; }
    public UUID getUserId() { return userId; }
    public String getPlan() { return plan; }

    public LocalDateTime getTrialEndsAt() { return trialEndsAt; }
    public void setTrialEndsAt(LocalDateTime trialEndsAt) { this.trialEndsAt = trialEndsAt; }

    public boolean isReadOnly() { return readOnly; }
    public void setReadOnly(boolean readOnly) { this.readOnly = readOnly; }

    public boolean isInTrial() { return inTrial; }
    public void setInTrial(boolean inTrial) { this.inTrial = inTrial; }

    public boolean isOverFreeLimit() { return overFreeLimit; }
    public void setOverFreeLimit(boolean overFreeLimit) { this.overFreeLimit = overFreeLimit; }

    public boolean isStrictReadOnly() { return strictReadOnly; }
    public void setStrictReadOnly(boolean strictReadOnly) { this.strictReadOnly = strictReadOnly; }

    public String getPublicHandle() { return publicHandle; }
    public void setPublicHandle(String publicHandle) { this.publicHandle = publicHandle; }
    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getFeaturedCollection() { return featuredCollection; }
    public void setFeaturedCollection(String featuredCollection) { this.featuredCollection = featuredCollection; }
    public String getContactWhatsapp() { return contactWhatsapp; }
    public void setContactWhatsapp(String contactWhatsapp) { this.contactWhatsapp = contactWhatsapp; }
    public String getContactInstagram() { return contactInstagram; }
    public void setContactInstagram(String contactInstagram) { this.contactInstagram = contactInstagram; }
    public String getProfileCountry() { return profileCountry; }
    public void setProfileCountry(String profileCountry) { this.profileCountry = profileCountry; }
    public String getProfileState() { return profileState; }
    public void setProfileState(String profileState) { this.profileState = profileState; }
    public String getProfileCity() { return profileCity; }
    public void setProfileCity(String profileCity) { this.profileCity = profileCity; }
    public Integer getQrPrintExports() { return qrPrintExports; }
    public void setQrPrintExports(Integer qrPrintExports) { this.qrPrintExports = qrPrintExports; }
    public String getProfilePhoto() { return profilePhoto; }
    public void setProfilePhoto(String profilePhoto) { this.profilePhoto = profilePhoto; }

    public boolean isAdmin() { return admin; }
    public void setAdmin(boolean admin) { this.admin = admin; }
}
