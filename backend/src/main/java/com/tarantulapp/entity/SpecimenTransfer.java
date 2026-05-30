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

/**
 * An email-based, non-monetary, irreversible transfer of specimen custody between keepers.
 * The passport's origin is never changed, so provenance is preserved across transfers.
 */
@Entity
@Table(name = "specimen_transfers")
public class SpecimenTransfer {

    public static final String PENDING = "pending";
    public static final String ACCEPTED = "accepted";
    public static final String CANCELLED = "cancelled";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "passport_id", columnDefinition = "uuid", nullable = false)
    private UUID passportId;

    @Column(name = "tarantula_id", columnDefinition = "uuid")
    private UUID tarantulaId;

    @Column(name = "from_user_id", columnDefinition = "uuid", nullable = false)
    private UUID fromUserId;

    @Column(name = "to_email", length = 255, nullable = false)
    private String toEmail;

    @Column(name = "to_user_id", columnDefinition = "uuid")
    private UUID toUserId;

    @Column(name = "status", length = 20, nullable = false)
    private String status = PENDING;

    @Column(name = "message", length = 500)
    private String message;

    @Column(name = "created_at", updatable = false, nullable = false)
    private Instant createdAt;

    @Column(name = "accepted_at")
    private Instant acceptedAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (status == null) {
            status = PENDING;
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getPassportId() { return passportId; }
    public void setPassportId(UUID passportId) { this.passportId = passportId; }
    public UUID getTarantulaId() { return tarantulaId; }
    public void setTarantulaId(UUID tarantulaId) { this.tarantulaId = tarantulaId; }
    public UUID getFromUserId() { return fromUserId; }
    public void setFromUserId(UUID fromUserId) { this.fromUserId = fromUserId; }
    public String getToEmail() { return toEmail; }
    public void setToEmail(String toEmail) { this.toEmail = toEmail; }
    public UUID getToUserId() { return toUserId; }
    public void setToUserId(UUID toUserId) { this.toUserId = toUserId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getAcceptedAt() { return acceptedAt; }
    public void setAcceptedAt(Instant acceptedAt) { this.acceptedAt = acceptedAt; }
    public Instant getCancelledAt() { return cancelledAt; }
    public void setCancelledAt(Instant cancelledAt) { this.cancelledAt = cancelledAt; }
}
