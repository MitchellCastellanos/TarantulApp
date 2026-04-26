package com.tarantulapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

/**
 * One row per provider event the backend has acknowledged. Used to make webhook
 * handlers idempotent — Stripe and Google Play both retry until they receive 200,
 * and without this table a duplicate delivery would re-run side effects (double
 * receipts, duplicate plan upgrades, etc.).
 */
@Entity
@Table(name = "processed_webhook_events")
public class ProcessedWebhookEvent {

    @Id
    @Column(name = "event_id", length = 255, nullable = false, updatable = false)
    private String eventId;

    @Column(name = "source", length = 64, nullable = false)
    private String source;

    @Column(name = "event_type", length = 128)
    private String eventType;

    @Column(name = "received_at", nullable = false)
    private OffsetDateTime receivedAt;

    @PrePersist
    void onCreate() {
        if (receivedAt == null) {
            receivedAt = OffsetDateTime.now();
        }
    }

    public String getEventId() { return eventId; }
    public void setEventId(String eventId) { this.eventId = eventId; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public OffsetDateTime getReceivedAt() { return receivedAt; }
    public void setReceivedAt(OffsetDateTime receivedAt) { this.receivedAt = receivedAt; }
}
