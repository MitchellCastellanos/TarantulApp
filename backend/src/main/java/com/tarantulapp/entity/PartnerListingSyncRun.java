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
@Table(name = "partner_listing_sync_runs")
public class PartnerListingSyncRun {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "official_vendor_id", nullable = false, columnDefinition = "uuid")
    private UUID officialVendorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "trigger_source", nullable = false, length = 40)
    private PartnerListingSyncTriggerSource triggerSource;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PartnerListingSyncRunStatus status = PartnerListingSyncRunStatus.RUNNING;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    @Column(name = "processed_count", nullable = false)
    private Integer processedCount = 0;

    @Column(name = "upserted_count", nullable = false)
    private Integer upsertedCount = 0;

    @Column(name = "stale_count", nullable = false)
    private Integer staleCount = 0;

    @Column(name = "failed_count", nullable = false)
    private Integer failedCount = 0;

    @Column(name = "skipped_count", nullable = false)
    private Integer skippedCount = 0;

    @Column(name = "error_message", length = 1500)
    private String errorMessage;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        if (startedAt == null) {
            startedAt = now;
        }
    }

    @PreUpdate
    void onUpdate() {
        // No-op, timestamps are managed explicitly by sync lifecycle.
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getOfficialVendorId() { return officialVendorId; }
    public void setOfficialVendorId(UUID officialVendorId) { this.officialVendorId = officialVendorId; }
    public PartnerListingSyncTriggerSource getTriggerSource() { return triggerSource; }
    public void setTriggerSource(PartnerListingSyncTriggerSource triggerSource) { this.triggerSource = triggerSource; }
    public PartnerListingSyncRunStatus getStatus() { return status; }
    public void setStatus(PartnerListingSyncRunStatus status) { this.status = status; }
    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }
    public Instant getFinishedAt() { return finishedAt; }
    public void setFinishedAt(Instant finishedAt) { this.finishedAt = finishedAt; }
    public Integer getProcessedCount() { return processedCount; }
    public void setProcessedCount(Integer processedCount) { this.processedCount = processedCount; }
    public Integer getUpsertedCount() { return upsertedCount; }
    public void setUpsertedCount(Integer upsertedCount) { this.upsertedCount = upsertedCount; }
    public Integer getStaleCount() { return staleCount; }
    public void setStaleCount(Integer staleCount) { this.staleCount = staleCount; }
    public Integer getFailedCount() { return failedCount; }
    public void setFailedCount(Integer failedCount) { this.failedCount = failedCount; }
    public Integer getSkippedCount() { return skippedCount; }
    public void setSkippedCount(Integer skippedCount) { this.skippedCount = skippedCount; }
    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
    public Instant getCreatedAt() { return createdAt; }
}
