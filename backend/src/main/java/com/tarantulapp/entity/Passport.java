package com.tarantulapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "passports")
public class Passport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "short_id", unique = true, nullable = false, length = 10)
    private String shortId;

    @Column(name = "created_by_user_id", columnDefinition = "uuid")
    private UUID createdByUserId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "species_id")
    private Species species;

    @Column(length = 20)
    private String stage;

    @Column(length = 10)
    private String sex;

    @Column(name = "origin_user_id", columnDefinition = "uuid")
    private UUID originUserId;

    @Column(name = "pro_gift_days", nullable = false)
    private Integer proGiftDays = 30;

    @Column(name = "label_notes", columnDefinition = "TEXT")
    private String labelNotes;

    @Column(name = "claimed_at")
    private Instant claimedAt;

    @Column(name = "claimed_by_user_id", columnDefinition = "uuid")
    private UUID claimedByUserId;

    @Column(name = "tarantula_id", columnDefinition = "uuid")
    private UUID tarantulaId;

    /** Anti-abuse: set the first (and only) time this passport pays out a Pro grant. */
    @Column(name = "pro_granted_at")
    private Instant proGrantedAt;

    /** Set once the 2h "claim not confirmed" alert has been processed for this passport. */
    @Column(name = "claim_pending_alert_sent_at")
    private Instant claimPendingAlertSentAt;

    @Column(name = "batch_id", columnDefinition = "uuid")
    private UUID batchId;

    /** Claim lifecycle gate; see {@link PassportClaimStatus}. */
    @Enumerated(EnumType.STRING)
    @Column(name = "claim_status", nullable = false, length = 20)
    private PassportClaimStatus claimStatus = PassportClaimStatus.CLAIMABLE;

    /**
     * Business-held claim code (proof of purchase for ON_SHELF labels). Stored in plain text on
     * purpose: the issuer must be able to read it back at the point of sale, and it only gates
     * the claim of this one label — it grants no account access.
     */
    @Column(name = "claim_code", length = 16)
    private String claimCode;

    /** Last time the issuer/admin released this passport for open claim (ON_SHELF → CLAIMABLE). */
    @Column(name = "claim_released_at")
    private Instant claimReleasedAt;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
        if (proGiftDays == null) {
            proGiftDays = 30;
        }
        if (claimStatus == null) {
            claimStatus = PassportClaimStatus.CLAIMABLE;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public boolean isClaimed() {
        return claimedAt != null;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getShortId() { return shortId; }
    public void setShortId(String shortId) { this.shortId = shortId; }
    public UUID getCreatedByUserId() { return createdByUserId; }
    public void setCreatedByUserId(UUID createdByUserId) { this.createdByUserId = createdByUserId; }
    public Species getSpecies() { return species; }
    public void setSpecies(Species species) { this.species = species; }
    public String getStage() { return stage; }
    public void setStage(String stage) { this.stage = stage; }
    public String getSex() { return sex; }
    public void setSex(String sex) { this.sex = sex; }
    public UUID getOriginUserId() { return originUserId; }
    public void setOriginUserId(UUID originUserId) { this.originUserId = originUserId; }
    public Integer getProGiftDays() { return proGiftDays; }
    public void setProGiftDays(Integer proGiftDays) { this.proGiftDays = proGiftDays; }
    public String getLabelNotes() { return labelNotes; }
    public void setLabelNotes(String labelNotes) { this.labelNotes = labelNotes; }
    public Instant getProGrantedAt() { return proGrantedAt; }
    public void setProGrantedAt(Instant proGrantedAt) { this.proGrantedAt = proGrantedAt; }
    public Instant getClaimPendingAlertSentAt() { return claimPendingAlertSentAt; }
    public void setClaimPendingAlertSentAt(Instant claimPendingAlertSentAt) { this.claimPendingAlertSentAt = claimPendingAlertSentAt; }
    public Instant getClaimedAt() { return claimedAt; }
    public void setClaimedAt(Instant claimedAt) { this.claimedAt = claimedAt; }
    public UUID getClaimedByUserId() { return claimedByUserId; }
    public void setClaimedByUserId(UUID claimedByUserId) { this.claimedByUserId = claimedByUserId; }
    public UUID getTarantulaId() { return tarantulaId; }
    public void setTarantulaId(UUID tarantulaId) { this.tarantulaId = tarantulaId; }
    public UUID getBatchId() { return batchId; }
    public void setBatchId(UUID batchId) { this.batchId = batchId; }
    public PassportClaimStatus getClaimStatus() { return claimStatus; }
    public void setClaimStatus(PassportClaimStatus claimStatus) { this.claimStatus = claimStatus; }
    public String getClaimCode() { return claimCode; }
    public void setClaimCode(String claimCode) { this.claimCode = claimCode; }
    public Instant getClaimReleasedAt() { return claimReleasedAt; }
    public void setClaimReleasedAt(Instant claimReleasedAt) { this.claimReleasedAt = claimReleasedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
