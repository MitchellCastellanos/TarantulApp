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
@Table(name = "referral_redemptions")
public class ReferralRedemption {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "referrer_user_id", nullable = false, columnDefinition = "uuid")
    private UUID referrerUserId;

    @Column(name = "referee_user_id", nullable = false, unique = true, columnDefinition = "uuid")
    private UUID refereeUserId;

    @Column(name = "code_snapshot", nullable = false, length = 24)
    private String codeSnapshot;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getReferrerUserId() { return referrerUserId; }
    public void setReferrerUserId(UUID referrerUserId) { this.referrerUserId = referrerUserId; }
    public UUID getRefereeUserId() { return refereeUserId; }
    public void setRefereeUserId(UUID refereeUserId) { this.refereeUserId = refereeUserId; }
    public String getCodeSnapshot() { return codeSnapshot; }
    public void setCodeSnapshot(String codeSnapshot) { this.codeSnapshot = codeSnapshot; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
