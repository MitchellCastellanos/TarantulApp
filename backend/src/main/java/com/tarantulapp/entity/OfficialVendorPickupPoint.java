package com.tarantulapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "official_vendor_pickup_points")
public class OfficialVendorPickupPoint {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "official_vendor_id", nullable = false, columnDefinition = "uuid")
    private UUID officialVendorId;

    @Column(name = "pickup_point_id", nullable = false, columnDefinition = "uuid")
    private UUID pickupPointId;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(name = "default_for_vendor", nullable = false)
    private Boolean defaultForVendor = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        if (active == null) active = true;
        if (defaultForVendor == null) defaultForVendor = false;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
        if (active == null) active = true;
        if (defaultForVendor == null) defaultForVendor = false;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getOfficialVendorId() { return officialVendorId; }
    public void setOfficialVendorId(UUID officialVendorId) { this.officialVendorId = officialVendorId; }
    public UUID getPickupPointId() { return pickupPointId; }
    public void setPickupPointId(UUID pickupPointId) { this.pickupPointId = pickupPointId; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
    public Boolean getDefaultForVendor() { return defaultForVendor; }
    public void setDefaultForVendor(Boolean defaultForVendor) { this.defaultForVendor = defaultForVendor; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
