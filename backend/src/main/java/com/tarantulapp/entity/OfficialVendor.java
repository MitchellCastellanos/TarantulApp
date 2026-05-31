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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
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

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "logo_bw_url")
    private String logoBwUrl;

    @Column(nullable = false)
    private Boolean enabled = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "partner_program_tier", length = 40)
    private PartnerProgramTier partnerProgramTier;

    @Column(name = "listing_import_enabled", nullable = false)
    private Boolean listingImportEnabled = false;

    @Column(name = "is_demo", nullable = false)
    private Boolean isDemo = false;

    /** Store origin for WooCommerce sync and cart handoff (e.g. https://example.com). */
    @Column(name = "feed_base_url", length = 350)
    private String feedBaseUrl;

    /** Adapter key: woocommerce, static, mock. */
    @Column(name = "feed_type", length = 40)
    private String feedType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "feed_config", columnDefinition = "jsonb", nullable = false)
    private Map<String, Object> feedConfig = new LinkedHashMap<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        if (feedConfig == null) {
            feedConfig = new LinkedHashMap<>();
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
        if (feedConfig == null) {
            feedConfig = new LinkedHashMap<>();
        }
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
    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }
    public String getLogoBwUrl() { return logoBwUrl; }
    public void setLogoBwUrl(String logoBwUrl) { this.logoBwUrl = logoBwUrl; }
    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    public PartnerProgramTier getPartnerProgramTier() { return partnerProgramTier; }
    public void setPartnerProgramTier(PartnerProgramTier partnerProgramTier) { this.partnerProgramTier = partnerProgramTier; }
    public Boolean getListingImportEnabled() { return listingImportEnabled; }
    public void setListingImportEnabled(Boolean listingImportEnabled) { this.listingImportEnabled = listingImportEnabled; }
    public Boolean getIsDemo() { return isDemo; }
    public void setIsDemo(Boolean isDemo) { this.isDemo = isDemo; }
    public String getFeedBaseUrl() { return feedBaseUrl; }
    public void setFeedBaseUrl(String feedBaseUrl) { this.feedBaseUrl = feedBaseUrl; }
    public String getFeedType() { return feedType; }
    public void setFeedType(String feedType) { this.feedType = feedType; }
    public Map<String, Object> getFeedConfig() { return feedConfig; }
    public void setFeedConfig(Map<String, Object> feedConfig) { this.feedConfig = feedConfig; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
