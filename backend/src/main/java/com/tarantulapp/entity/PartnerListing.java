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

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "partner_listings")
public class PartnerListing {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "official_vendor_id", nullable = false, columnDefinition = "uuid")
    private UUID officialVendorId;

    @Column(name = "external_id", nullable = false, length = 180)
    private String externalId;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(length = 2000)
    private String description;

    @Column(name = "species_name_raw", length = 180)
    private String speciesNameRaw;

    @Column(name = "species_normalized", length = 180)
    private String speciesNormalized;

    @Column(name = "species_id")
    private Integer speciesId;

    @Column(name = "price_amount", precision = 10, scale = 2)
    private BigDecimal priceAmount;

    @Column(nullable = false, length = 8)
    private String currency = "USD";

    @Column(name = "stock_quantity")
    private Integer stockQuantity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PartnerListingAvailability availability = PartnerListingAvailability.UNKNOWN;

    @Column(name = "image_url", length = 600)
    private String imageUrl;

    @Column(name = "product_canonical_url", nullable = false, length = 600)
    private String productCanonicalUrl;

    @Column(length = 80)
    private String country;

    @Column(length = 80)
    private String state;

    @Column(length = 80)
    private String city;

    @Column(name = "last_synced_at", nullable = false)
    private Instant lastSyncedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PartnerListingStatus status = PartnerListingStatus.ACTIVE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        if (lastSyncedAt == null) {
            lastSyncedAt = now;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getOfficialVendorId() { return officialVendorId; }
    public void setOfficialVendorId(UUID officialVendorId) { this.officialVendorId = officialVendorId; }
    public String getExternalId() { return externalId; }
    public void setExternalId(String externalId) { this.externalId = externalId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getSpeciesNameRaw() { return speciesNameRaw; }
    public void setSpeciesNameRaw(String speciesNameRaw) { this.speciesNameRaw = speciesNameRaw; }
    public String getSpeciesNormalized() { return speciesNormalized; }
    public void setSpeciesNormalized(String speciesNormalized) { this.speciesNormalized = speciesNormalized; }
    public Integer getSpeciesId() { return speciesId; }
    public void setSpeciesId(Integer speciesId) { this.speciesId = speciesId; }
    public BigDecimal getPriceAmount() { return priceAmount; }
    public void setPriceAmount(BigDecimal priceAmount) { this.priceAmount = priceAmount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public Integer getStockQuantity() { return stockQuantity; }
    public void setStockQuantity(Integer stockQuantity) { this.stockQuantity = stockQuantity; }
    public PartnerListingAvailability getAvailability() { return availability; }
    public void setAvailability(PartnerListingAvailability availability) { this.availability = availability; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public String getProductCanonicalUrl() { return productCanonicalUrl; }
    public void setProductCanonicalUrl(String productCanonicalUrl) { this.productCanonicalUrl = productCanonicalUrl; }
    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public Instant getLastSyncedAt() { return lastSyncedAt; }
    public void setLastSyncedAt(Instant lastSyncedAt) { this.lastSyncedAt = lastSyncedAt; }
    public PartnerListingStatus getStatus() { return status; }
    public void setStatus(PartnerListingStatus status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
