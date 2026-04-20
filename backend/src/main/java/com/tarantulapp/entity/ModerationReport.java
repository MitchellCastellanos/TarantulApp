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
@Table(name = "moderation_reports")
public class ModerationReport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "reporter_user_id", columnDefinition = "uuid")
    private UUID reporterUserId;

    @Column(name = "target_type", nullable = false, length = 40)
    private String targetType;

    @Column(name = "target_id", columnDefinition = "uuid")
    private UUID targetId;

    @Column(name = "target_ref", length = 120)
    private String targetRef;

    @Column(nullable = false, length = 80)
    private String reason;

    @Column(columnDefinition = "text")
    private String details;

    @Column(nullable = false, length = 20)
    private String status = "open";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "resolved_by", columnDefinition = "uuid")
    private UUID resolvedBy;

    @Column(name = "resolution_note", columnDefinition = "text")
    private String resolutionNote;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getReporterUserId() { return reporterUserId; }
    public void setReporterUserId(UUID reporterUserId) { this.reporterUserId = reporterUserId; }
    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }
    public UUID getTargetId() { return targetId; }
    public void setTargetId(UUID targetId) { this.targetId = targetId; }
    public String getTargetRef() { return targetRef; }
    public void setTargetRef(String targetRef) { this.targetRef = targetRef; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(Instant resolvedAt) { this.resolvedAt = resolvedAt; }
    public UUID getResolvedBy() { return resolvedBy; }
    public void setResolvedBy(UUID resolvedBy) { this.resolvedBy = resolvedBy; }
    public String getResolutionNote() { return resolutionNote; }
    public void setResolutionNote(String resolutionNote) { this.resolutionNote = resolutionNote; }
}
