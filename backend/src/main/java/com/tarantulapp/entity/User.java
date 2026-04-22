package com.tarantulapp.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @Column(unique = true, nullable = false, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "display_name", length = 100)
    private String displayName;

    @Column(name = "public_handle", length = 60)
    private String publicHandle;

    @Column(length = 500)
    private String bio;

    @Column(length = 140)
    private String location;

    @Column(name = "featured_collection", length = 180)
    private String featuredCollection;

    @Column(name = "contact_whatsapp", length = 80)
    private String contactWhatsapp;

    @Column(name = "contact_instagram", length = 80)
    private String contactInstagram;

    @Column(name = "profile_country", length = 80)
    private String profileCountry;

    @Column(name = "profile_state", length = 80)
    private String profileState;

    @Column(name = "profile_city", length = 80)
    private String profileCity;

    @Column(name = "qr_print_exports", nullable = false)
    private Integer qrPrintExports = 0;

    @Column(name = "profile_photo", length = 500)
    private String profilePhoto;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserPlan plan;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    /** Fin del periodo de prueba de 7 días (registro). Null = cuentas sin trial (retrocompatibilidad). */
    @Column(name = "trial_ends_at")
    private LocalDateTime trialEndsAt;

    /** Usuario que invitó (referidos); null si registro orgánico. */
    @Column(name = "referred_by_user_id", columnDefinition = "uuid")
    private UUID referredByUserId;

    /** Bits para hitos de referidos ya otorgados (ver ReferralService). */
    @Column(name = "referral_milestone_mask", nullable = false)
    private Integer referralMilestoneMask = 0;

    @Column(name = "founder_keeper", nullable = false)
    private Boolean founderKeeper = false;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (plan == null) {
            plan = UserPlan.FREE;
        }
        if (referralMilestoneMask == null) {
            referralMilestoneMask = 0;
        }
        if (founderKeeper == null) {
            founderKeeper = false;
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

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

    public UserPlan getPlan() { return plan; }
    public void setPlan(UserPlan plan) { this.plan = plan; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getTrialEndsAt() { return trialEndsAt; }
    public void setTrialEndsAt(LocalDateTime trialEndsAt) { this.trialEndsAt = trialEndsAt; }

    public UUID getReferredByUserId() { return referredByUserId; }
    public void setReferredByUserId(UUID referredByUserId) { this.referredByUserId = referredByUserId; }

    public Integer getReferralMilestoneMask() { return referralMilestoneMask; }
    public void setReferralMilestoneMask(Integer referralMilestoneMask) { this.referralMilestoneMask = referralMilestoneMask; }

    public Boolean getFounderKeeper() { return founderKeeper; }
    public void setFounderKeeper(Boolean founderKeeper) { this.founderKeeper = founderKeeper; }

}
