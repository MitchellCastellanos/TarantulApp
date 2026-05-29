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
@Table(name = "passport_claim_events")
public class PassportClaimEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "passport_id", columnDefinition = "uuid", nullable = false)
    private UUID passportId;

    @Column(name = "claimed_by_user_id", columnDefinition = "uuid", nullable = false)
    private UUID claimedByUserId;

    @Column(name = "pro_grant_id", columnDefinition = "uuid")
    private UUID proGrantId;

    @Column(name = "feeding_reminder_created", nullable = false)
    private Boolean feedingReminderCreated = false;

    @Column(name = "created_at", updatable = false, nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (feedingReminderCreated == null) {
            feedingReminderCreated = false;
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getPassportId() { return passportId; }
    public void setPassportId(UUID passportId) { this.passportId = passportId; }
    public UUID getClaimedByUserId() { return claimedByUserId; }
    public void setClaimedByUserId(UUID claimedByUserId) { this.claimedByUserId = claimedByUserId; }
    public UUID getProGrantId() { return proGrantId; }
    public void setProGrantId(UUID proGrantId) { this.proGrantId = proGrantId; }
    public Boolean getFeedingReminderCreated() { return feedingReminderCreated; }
    public void setFeedingReminderCreated(Boolean feedingReminderCreated) { this.feedingReminderCreated = feedingReminderCreated; }
    public Instant getCreatedAt() { return createdAt; }
}
