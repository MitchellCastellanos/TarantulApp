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
@Table(name = "sex_id_case_votes")
public class SexIdCaseVote {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "case_id", nullable = false, columnDefinition = "uuid")
    private UUID caseId;

    @Column(name = "voter_user_id", nullable = false, columnDefinition = "uuid")
    private UUID voterUserId;

    @Column(nullable = false, length = 20)
    private String choice;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant n = Instant.now();
        if (createdAt == null) {
            createdAt = n;
        }
        updatedAt = n;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getCaseId() { return caseId; }
    public void setCaseId(UUID caseId) { this.caseId = caseId; }
    public UUID getVoterUserId() { return voterUserId; }
    public void setVoterUserId(UUID voterUserId) { this.voterUserId = voterUserId; }
    public String getChoice() { return choice; }
    public void setChoice(String choice) { this.choice = choice; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
