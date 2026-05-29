package com.tarantulapp.entity;

import jakarta.persistence.*;
import java.time.Instant;
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

    @Column(name = "storefront_name", length = 120)
    private String storefrontName;

    @Column(name = "storefront_tagline", length = 180)
    private String storefrontTagline;

    @Column(name = "storefront_shipping_policy", length = 1000)
    private String storefrontShippingPolicy;

    @Column(name = "storefront_lag_policy", length = 1000)
    private String storefrontLagPolicy;

    @Column(name = "profile_country", length = 80)
    private String profileCountry;

    @Column(name = "profile_state", length = 80)
    private String profileState;

    @Column(name = "profile_city", length = 80)
    private String profileCity;

    /** CSV of ISO-3166-1 alpha-2 destinations this seller ships to (e.g. "MX,CA,US"). Null/empty = unconfigured. */
    @Column(name = "ships_to", length = 512)
    private String shipsTo;

    @Column(name = "qr_print_exports", nullable = false)
    private Integer qrPrintExports = 0;

    @Column(name = "profile_photo", length = 500)
    private String profilePhoto;

    @Column(name = "search_visible", nullable = false)
    private Boolean searchVisible = true;

    @Column(name = "community_profile_visibility", nullable = false, length = 20)
    private String communityProfileVisibility = "public_full";

    /** When true, newly created tarantulas default to is_public=true for this keeper. */
    @Column(name = "default_tarantula_public", nullable = false)
    private Boolean defaultTarantulaPublic = true;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserPlan plan;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_activity_at")
    private LocalDateTime lastActivityAt;

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

    @Column(name = "is_beta_tester", nullable = false)
    private Boolean isBetaTester = false;

    @Column(name = "verified_breeder", nullable = false)
    private Boolean verifiedBreeder = false;

    @Column(name = "verified_breeder_at")
    private Instant verifiedBreederAt;

    /** Trust badge after live review or approved self-verification submission. */
    @Column(name = "storefront_verified_at")
    private Instant storefrontVerifiedAt;

    /** Public Verified Origin badge (canonical trust signal for commerce surfaces). */
    @Column(name = "verified_origin_at")
    private Instant verifiedOriginAt;

    @Column(name = "verified_origin_kind", length = 20)
    private String verifiedOriginKind;

    /** Internal ops signal; never exposed in public DTOs. */
    @Column(name = "origin_trust_score", nullable = false)
    private Integer originTrustScore = 0;

    /** Non-null when a vendor invite email is pending (user must accept before verified_breeder is set). */
    @Column(name = "vendor_invite_token", columnDefinition = "uuid")
    private UUID vendorInviteToken;

    @Column(name = "vendor_invite_sent_at")
    private Instant vendorInviteSentAt;

    @Column(name = "vendor_invite_expires_at")
    private Instant vendorInviteExpiresAt;

    @Column(name = "beta_cohort", length = 80)
    private String betaCohort;

    @Column(name = "beta_country", length = 80)
    private String betaCountry;

    @Column(name = "beta_experience_level", length = 40)
    private String betaExperienceLevel;

    /** Idioma preferido para correos de beta (es / en), p. ej. desde la solicitud aprobada. */
    @Column(name = "beta_preferred_locale", length = 8)
    private String betaPreferredLocale;

    /** Idioma preferido para correos transaccionales (Pro grants, recibos). Capturado en login/registro. */
    @Column(name = "preferred_locale", length = 8)
    private String preferredLocale;

    /** Aceptación del acuerdo de beta tester (modal primer login). */
    @Column(name = "beta_agreement_accepted_at")
    private Instant betaAgreementAcceptedAt;

    /** Play testing Google Group sync status; see {@link com.tarantulapp.service.GoogleGroupSyncStatus}. All accounts are eligible for sync. */
    @Column(name = "google_group_sync_status", length = 32)
    private String googleGroupSyncStatus;

    @Column(name = "google_group_sync_last_error", length = 500)
    private String googleGroupSyncLastError;

    /** Per-user admin flag (V65). APP_ADMIN_EMAILS is bootstrap-only: AuthService promotes on first login. */
    @Column(name = "is_admin", nullable = false)
    private Boolean isAdmin = false;
    /** Limited ops role for growth workflows (Ad Studio + Partner Outreach) without full admin powers. */
    @Column(name = "is_marketing_ops", nullable = false)
    private Boolean isMarketingOps = false;

    /** May create batches and generate passports in Studio. */
    @Column(name = "passport_creator_enabled_at")
    private Instant passportCreatorEnabledAt;

    /** Studio appears in primary navigation when set. */
    @Column(name = "studio_activated_at")
    private Instant studioActivatedAt;

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
        if (isBetaTester == null) {
            isBetaTester = false;
        }
        if (verifiedBreeder == null) {
            verifiedBreeder = false;
        }
        if (searchVisible == null) {
            searchVisible = true;
        }
        if (communityProfileVisibility == null || communityProfileVisibility.isBlank()) {
            communityProfileVisibility = "public_full";
        }
        if (defaultTarantulaPublic == null) {
            defaultTarantulaPublic = true;
        }
        if (isAdmin == null) {
            isAdmin = false;
        }
        if (isMarketingOps == null) {
            isMarketingOps = false;
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

    public String getStorefrontName() { return storefrontName; }
    public void setStorefrontName(String storefrontName) { this.storefrontName = storefrontName; }

    public String getStorefrontTagline() { return storefrontTagline; }
    public void setStorefrontTagline(String storefrontTagline) { this.storefrontTagline = storefrontTagline; }

    public String getStorefrontShippingPolicy() { return storefrontShippingPolicy; }
    public void setStorefrontShippingPolicy(String storefrontShippingPolicy) { this.storefrontShippingPolicy = storefrontShippingPolicy; }

    public String getStorefrontLagPolicy() { return storefrontLagPolicy; }
    public void setStorefrontLagPolicy(String storefrontLagPolicy) { this.storefrontLagPolicy = storefrontLagPolicy; }

    public String getProfileCountry() { return profileCountry; }
    public void setProfileCountry(String profileCountry) { this.profileCountry = profileCountry; }

    public String getProfileState() { return profileState; }
    public void setProfileState(String profileState) { this.profileState = profileState; }

    public String getProfileCity() { return profileCity; }
    public void setProfileCity(String profileCity) { this.profileCity = profileCity; }

    public String getShipsTo() { return shipsTo; }
    public void setShipsTo(String shipsTo) { this.shipsTo = shipsTo; }

    public Integer getQrPrintExports() { return qrPrintExports; }
    public void setQrPrintExports(Integer qrPrintExports) { this.qrPrintExports = qrPrintExports; }

    public String getProfilePhoto() { return profilePhoto; }
    public void setProfilePhoto(String profilePhoto) { this.profilePhoto = profilePhoto; }

    public Boolean getSearchVisible() { return searchVisible; }
    public void setSearchVisible(Boolean searchVisible) { this.searchVisible = searchVisible; }

    public String getCommunityProfileVisibility() { return communityProfileVisibility; }
    public void setCommunityProfileVisibility(String communityProfileVisibility) { this.communityProfileVisibility = communityProfileVisibility; }

    public Boolean getDefaultTarantulaPublic() { return defaultTarantulaPublic; }
    public void setDefaultTarantulaPublic(Boolean defaultTarantulaPublic) { this.defaultTarantulaPublic = defaultTarantulaPublic; }

    public UserPlan getPlan() { return plan; }
    public void setPlan(UserPlan plan) { this.plan = plan; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getLastActivityAt() { return lastActivityAt; }
    public void setLastActivityAt(LocalDateTime lastActivityAt) { this.lastActivityAt = lastActivityAt; }

    public LocalDateTime getTrialEndsAt() { return trialEndsAt; }
    public void setTrialEndsAt(LocalDateTime trialEndsAt) { this.trialEndsAt = trialEndsAt; }

    public UUID getReferredByUserId() { return referredByUserId; }
    public void setReferredByUserId(UUID referredByUserId) { this.referredByUserId = referredByUserId; }

    public Integer getReferralMilestoneMask() { return referralMilestoneMask; }
    public void setReferralMilestoneMask(Integer referralMilestoneMask) { this.referralMilestoneMask = referralMilestoneMask; }

    public Boolean getFounderKeeper() { return founderKeeper; }
    public void setFounderKeeper(Boolean founderKeeper) { this.founderKeeper = founderKeeper; }

    public Boolean getIsBetaTester() { return isBetaTester; }
    public void setIsBetaTester(Boolean isBetaTester) { this.isBetaTester = isBetaTester; }

    public Boolean getVerifiedBreeder() { return verifiedBreeder; }
    public void setVerifiedBreeder(Boolean verifiedBreeder) { this.verifiedBreeder = verifiedBreeder; }

    public Instant getVerifiedBreederAt() { return verifiedBreederAt; }
    public void setVerifiedBreederAt(Instant verifiedBreederAt) { this.verifiedBreederAt = verifiedBreederAt; }

    public Instant getStorefrontVerifiedAt() { return storefrontVerifiedAt; }
    public void setStorefrontVerifiedAt(Instant storefrontVerifiedAt) { this.storefrontVerifiedAt = storefrontVerifiedAt; }

    public Instant getVerifiedOriginAt() { return verifiedOriginAt; }
    public void setVerifiedOriginAt(Instant verifiedOriginAt) { this.verifiedOriginAt = verifiedOriginAt; }
    public String getVerifiedOriginKind() { return verifiedOriginKind; }
    public void setVerifiedOriginKind(String verifiedOriginKind) { this.verifiedOriginKind = verifiedOriginKind; }
    public Integer getOriginTrustScore() { return originTrustScore; }
    public void setOriginTrustScore(Integer originTrustScore) { this.originTrustScore = originTrustScore; }

    public UUID getVendorInviteToken() { return vendorInviteToken; }
    public void setVendorInviteToken(UUID vendorInviteToken) { this.vendorInviteToken = vendorInviteToken; }

    public Instant getVendorInviteSentAt() { return vendorInviteSentAt; }
    public void setVendorInviteSentAt(Instant vendorInviteSentAt) { this.vendorInviteSentAt = vendorInviteSentAt; }

    public Instant getVendorInviteExpiresAt() { return vendorInviteExpiresAt; }
    public void setVendorInviteExpiresAt(Instant vendorInviteExpiresAt) { this.vendorInviteExpiresAt = vendorInviteExpiresAt; }

    public String getBetaCohort() { return betaCohort; }
    public void setBetaCohort(String betaCohort) { this.betaCohort = betaCohort; }

    public String getBetaCountry() { return betaCountry; }
    public void setBetaCountry(String betaCountry) { this.betaCountry = betaCountry; }

    public String getBetaExperienceLevel() { return betaExperienceLevel; }
    public void setBetaExperienceLevel(String betaExperienceLevel) { this.betaExperienceLevel = betaExperienceLevel; }

    public String getBetaPreferredLocale() { return betaPreferredLocale; }
    public void setBetaPreferredLocale(String betaPreferredLocale) { this.betaPreferredLocale = betaPreferredLocale; }

    public String getPreferredLocale() { return preferredLocale; }
    public void setPreferredLocale(String preferredLocale) { this.preferredLocale = preferredLocale; }

    public Instant getBetaAgreementAcceptedAt() { return betaAgreementAcceptedAt; }
    public void setBetaAgreementAcceptedAt(Instant betaAgreementAcceptedAt) { this.betaAgreementAcceptedAt = betaAgreementAcceptedAt; }

    public String getGoogleGroupSyncStatus() { return googleGroupSyncStatus; }
    public void setGoogleGroupSyncStatus(String googleGroupSyncStatus) { this.googleGroupSyncStatus = googleGroupSyncStatus; }

    public String getGoogleGroupSyncLastError() { return googleGroupSyncLastError; }
    public void setGoogleGroupSyncLastError(String googleGroupSyncLastError) { this.googleGroupSyncLastError = googleGroupSyncLastError; }

    public Boolean getIsAdmin() { return isAdmin; }
    public void setIsAdmin(Boolean isAdmin) { this.isAdmin = isAdmin; }
    public Boolean getIsMarketingOps() { return isMarketingOps; }
    public void setIsMarketingOps(Boolean isMarketingOps) { this.isMarketingOps = isMarketingOps; }

    public Instant getPassportCreatorEnabledAt() { return passportCreatorEnabledAt; }
    public void setPassportCreatorEnabledAt(Instant passportCreatorEnabledAt) { this.passportCreatorEnabledAt = passportCreatorEnabledAt; }

    public Instant getStudioActivatedAt() { return studioActivatedAt; }
    public void setStudioActivatedAt(Instant studioActivatedAt) { this.studioActivatedAt = studioActivatedAt; }

}
