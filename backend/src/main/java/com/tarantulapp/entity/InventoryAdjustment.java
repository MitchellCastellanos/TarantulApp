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
@Table(name = "inventory_adjustments")
public class InventoryAdjustment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "batch_id", columnDefinition = "uuid", nullable = false)
    private UUID batchId;

    @Column(name = "user_id", columnDefinition = "uuid", nullable = false)
    private UUID userId;

    @Column(name = "delta_sold", nullable = false)
    private Integer deltaSold = 0;

    @Column(name = "delta_total", nullable = false)
    private Integer deltaTotal = 0;

    @Column(nullable = false, length = 40)
    private String reason = "MANUAL";

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "passport_id", columnDefinition = "uuid")
    private UUID passportId;

    @Column(name = "created_at", updatable = false, nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getBatchId() { return batchId; }
    public void setBatchId(UUID batchId) { this.batchId = batchId; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public Integer getDeltaSold() { return deltaSold; }
    public void setDeltaSold(Integer deltaSold) { this.deltaSold = deltaSold; }
    public Integer getDeltaTotal() { return deltaTotal; }
    public void setDeltaTotal(Integer deltaTotal) { this.deltaTotal = deltaTotal; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public UUID getPassportId() { return passportId; }
    public void setPassportId(UUID passportId) { this.passportId = passportId; }
    public Instant getCreatedAt() { return createdAt; }
}
