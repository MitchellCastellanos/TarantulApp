package com.tarantulapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "launch_event_email_events")
public class LaunchEventEmailEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "registration_id", nullable = false)
    private LaunchEventRegistration registration;

    @Column(name = "event_key", nullable = false, length = 80)
    private String eventKey;

    @Column(name = "sent_at", nullable = false)
    private Instant sentAt = Instant.now();

    public void setRegistration(LaunchEventRegistration registration) {
        this.registration = registration;
    }

    public void setEventKey(String eventKey) {
        this.eventKey = eventKey;
    }
}
