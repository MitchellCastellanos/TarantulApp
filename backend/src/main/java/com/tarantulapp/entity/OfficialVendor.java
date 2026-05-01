package com.tarantulapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "official_vendors")
public class OfficialVendor {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(nullable = false, unique = true, length = 120)
    private String slug;

    @Column(nullable = false, length = 140)
    private String name;

    @Column(nullable = false, length = 80)
    private String country;

    @Column(length = 80)
    private String state;

    @Column(length = 80)
    private String city;

    @Column(name = "website_url", nullable = false, length = 350)
    private String websiteUrl;

    @Column(name = "national_shipping", nullable = false)
    private Boolean nationalShipping = false;

    @Column(name = "ships_to_countries", length = 350)
    private String shipsToCountries;

    @Column(name = "influence_score", nullable = false)
    private Integer influenceScore = 0;

    @Column(length = 200)
    private String note;

    @Column(length = 80)
    private String badge;

    @Column(nullable = false)
    private Boolean enabled = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "partner_program_tier", length = 40)
    private PartnerProgramTier partnerProgramTier;

    @Column(name = "listing_import_enabled", nullable = false)
    private Boolean listingImportEnabled = false;

    @Column(name = "is_demo", nullable = false)
    private Boolean isDemo = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getWebsiteUrl() { return websiteUrl; }
    public void setWebsiteUrl(String websiteUrl) { this.websiteUrl = websiteUrl; }
    public Boolean getNationalShipping() { return nationalShipping; }
    public void setNationalShipping(Boolean nationalShipping) { this.nationalShipping = nationalShipping; }
    public String getShipsToCountries() { return shipsToCountries; }
    public void setShipsToCountries(String shipsToCountries) { this.shipsToCountries = shipsToCountries; }
    public Integer getInfluenceScore() { return influenceScore; }
    public void setInfluenceScore(Integer influenceScore) { this.influenceScore = influenceScore; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public String getBadge() { return badge; }
    public void setBadge(String badge) { this.badge = badge; }
    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    public PartnerProgramTier getPartnerProgramTier() { return partnerProgramTier; }
    public void setPartnerProgramTier(PartnerProgramTier partnerProgramTier) { this.partnerProgramTier = partnerProgramTier; }
    public Boolean getListingImportEnabled() { return listingImportEnabled; }
    public void setListingImportEnabled(Boolean listingImportEnabled) { this.listingImportEnabled = listingImportEnabled; }
    public Boolean getIsDemo() { return isDemo; }
    public void setIsDemo(Boolean isDemo) { this.isDemo = isDemo; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
