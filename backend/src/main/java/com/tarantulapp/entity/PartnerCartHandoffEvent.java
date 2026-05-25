package com.tarantulapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "partner_cart_handoff_events")
public class PartnerCartHandoffEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "official_vendor_id", nullable = false, columnDefinition = "uuid")
    private UUID officialVendorId;

    @Column(name = "vendor_slug", nullable = false, length = 120)
    private String vendorSlug;

    @Column(name = "line_count", nullable = false)
    private Integer lineCount = 0;

    @Column(name = "total_quantity", nullable = false)
    private Integer totalQuantity = 0;

    @Column(name = "handoff_mode", length = 40)
    private String handoffMode;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getId() { return id; }
    public UUID getOfficialVendorId() { return officialVendorId; }
    public void setOfficialVendorId(UUID officialVendorId) { this.officialVendorId = officialVendorId; }
    public String getVendorSlug() { return vendorSlug; }
    public void setVendorSlug(String vendorSlug) { this.vendorSlug = vendorSlug; }
    public Integer getLineCount() { return lineCount; }
    public void setLineCount(Integer lineCount) { this.lineCount = lineCount; }
    public Integer getTotalQuantity() { return totalQuantity; }
    public void setTotalQuantity(Integer totalQuantity) { this.totalQuantity = totalQuantity; }
    public String getHandoffMode() { return handoffMode; }
    public void setHandoffMode(String handoffMode) { this.handoffMode = handoffMode; }
    public Instant getCreatedAt() { return createdAt; }
}
