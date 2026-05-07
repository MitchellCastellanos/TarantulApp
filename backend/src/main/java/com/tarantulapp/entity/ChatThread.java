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
@Table(name = "chat_threads")
public class ChatThread {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "user_low", nullable = false, columnDefinition = "uuid")
    private UUID userLow;

    @Column(name = "user_high", nullable = false, columnDefinition = "uuid")
    private UUID userHigh;

    @Column(name = "listing_id", columnDefinition = "uuid")
    private UUID listingId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "transaction_status", length = 24)
    private String transactionStatus;

    @Column(name = "transaction_status_updated_at")
    private Instant transactionStatusUpdatedAt;

    @Column(name = "transaction_status_updated_by_user_id", columnDefinition = "uuid")
    private UUID transactionStatusUpdatedByUserId;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getUserLow() { return userLow; }
    public void setUserLow(UUID userLow) { this.userLow = userLow; }
    public UUID getUserHigh() { return userHigh; }
    public void setUserHigh(UUID userHigh) { this.userHigh = userHigh; }
    public UUID getListingId() { return listingId; }
    public void setListingId(UUID listingId) { this.listingId = listingId; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public String getTransactionStatus() { return transactionStatus; }
    public void setTransactionStatus(String transactionStatus) { this.transactionStatus = transactionStatus; }
    public Instant getTransactionStatusUpdatedAt() { return transactionStatusUpdatedAt; }
    public void setTransactionStatusUpdatedAt(Instant transactionStatusUpdatedAt) { this.transactionStatusUpdatedAt = transactionStatusUpdatedAt; }
    public UUID getTransactionStatusUpdatedByUserId() { return transactionStatusUpdatedByUserId; }
    public void setTransactionStatusUpdatedByUserId(UUID transactionStatusUpdatedByUserId) { this.transactionStatusUpdatedByUserId = transactionStatusUpdatedByUserId; }
}
