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
@Table(name = "vendor_verification_submissions")
public class VendorVerificationSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "user_id", nullable = false, columnDefinition = "uuid")
    private UUID userId;

    @Column(nullable = false, length = 20)
    private String status = "pending";

    @Column(name = "selfie_media_url", length = 600)
    private String selfieMediaUrl;

    @Column(name = "inventory_media_url", length = 600)
    private String inventoryMediaUrl;

    @Column(name = "paper_media_url", length = 600)
    private String paperMediaUrl;

    @Column(name = "reviewer_note", length = 500)
    private String reviewerNote;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

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
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getSelfieMediaUrl() { return selfieMediaUrl; }
    public void setSelfieMediaUrl(String selfieMediaUrl) { this.selfieMediaUrl = selfieMediaUrl; }
    public String getInventoryMediaUrl() { return inventoryMediaUrl; }
    public void setInventoryMediaUrl(String inventoryMediaUrl) { this.inventoryMediaUrl = inventoryMediaUrl; }
    public String getPaperMediaUrl() { return paperMediaUrl; }
    public void setPaperMediaUrl(String paperMediaUrl) { this.paperMediaUrl = paperMediaUrl; }
    public String getReviewerNote() { return reviewerNote; }
    public void setReviewerNote(String reviewerNote) { this.reviewerNote = reviewerNote; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(Instant reviewedAt) { this.reviewedAt = reviewedAt; }
}
