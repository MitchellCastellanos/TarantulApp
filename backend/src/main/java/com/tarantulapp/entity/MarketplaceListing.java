package com.tarantulapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "marketplace_listings")
public class MarketplaceListing {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "seller_user_id", nullable = false, columnDefinition = "uuid")
    private UUID sellerUserId;

    @Column(nullable = false, length = 140)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(name = "species_name", length = 140)
    private String speciesName;

    @Column(length = 30)
    private String stage;

    @Column(length = 20)
    private String sex;

    @Column(name = "price_amount", precision = 10, scale = 2)
    private BigDecimal priceAmount;

    @Column(nullable = false, length = 8)
    private String currency = "MXN";

    @Column(nullable = false, length = 20)
    private String status = "active";

    @Column(length = 80)
    private String city;

    @Column(length = 80)
    private String state;

    @Column(length = 80)
    private String country;

    @Column(name = "image_url", length = 350)
    private String imageUrl;

    @Column(name = "pedigree_ref", length = 180)
    private String pedigreeRef;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** When set and in the future, listing is sorted above others in the peer feed. */
    @Column(name = "boosted_until")
    private Instant boostedUntil;

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
    public UUID getSellerUserId() { return sellerUserId; }
    public void setSellerUserId(UUID sellerUserId) { this.sellerUserId = sellerUserId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getSpeciesName() { return speciesName; }
    public void setSpeciesName(String speciesName) { this.speciesName = speciesName; }
    public String getStage() { return stage; }
    public void setStage(String stage) { this.stage = stage; }
    public String getSex() { return sex; }
    public void setSex(String sex) { this.sex = sex; }
    public BigDecimal getPriceAmount() { return priceAmount; }
    public void setPriceAmount(BigDecimal priceAmount) { this.priceAmount = priceAmount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getState() { return state; }
    public void setState(String state) { this.state = state; }
    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public String getPedigreeRef() { return pedigreeRef; }
    public void setPedigreeRef(String pedigreeRef) { this.pedigreeRef = pedigreeRef; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getBoostedUntil() { return boostedUntil; }
    public void setBoostedUntil(Instant boostedUntil) { this.boostedUntil = boostedUntil; }
}
