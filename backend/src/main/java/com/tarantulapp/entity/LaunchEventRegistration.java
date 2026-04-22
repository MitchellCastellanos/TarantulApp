package com.tarantulapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "launch_event_registrations")
public class LaunchEventRegistration {

    public enum Status {
        RESERVED,
        WAITLIST
    }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "full_name", nullable = false, length = 140)
    private String fullName;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(nullable = false, length = 40)
    private String phone;

    @Column(name = "owns_tarantulas", nullable = false)
    private boolean ownsTarantulas;

    @Column(name = "tarantula_count")
    private Integer tarantulaCount;

    @Column(name = "will_attend", nullable = false)
    private boolean willAttend = true;

    @Column(name = "bring_collection_info", nullable = false)
    private boolean bringCollectionInfo;

    @Column(name = "reminder_opt_in", nullable = false)
    private boolean reminderOptIn;

    @Column(name = "newsletter_opt_in", nullable = false)
    private boolean newsletterOptIn;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status;

    @Column(name = "reservation_index")
    private Integer reservationIndex;

    @Column(nullable = false, length = 8)
    private String language = "en";

    @Column(name = "source_path", length = 80)
    private String sourcePath;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

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

    public UUID getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public boolean isOwnsTarantulas() {
        return ownsTarantulas;
    }

    public void setOwnsTarantulas(boolean ownsTarantulas) {
        this.ownsTarantulas = ownsTarantulas;
    }

    public Integer getTarantulaCount() {
        return tarantulaCount;
    }

    public void setTarantulaCount(Integer tarantulaCount) {
        this.tarantulaCount = tarantulaCount;
    }

    public boolean isWillAttend() {
        return willAttend;
    }

    public void setWillAttend(boolean willAttend) {
        this.willAttend = willAttend;
    }

    public boolean isBringCollectionInfo() {
        return bringCollectionInfo;
    }

    public void setBringCollectionInfo(boolean bringCollectionInfo) {
        this.bringCollectionInfo = bringCollectionInfo;
    }

    public boolean isReminderOptIn() {
        return reminderOptIn;
    }

    public void setReminderOptIn(boolean reminderOptIn) {
        this.reminderOptIn = reminderOptIn;
    }

    public boolean isNewsletterOptIn() {
        return newsletterOptIn;
    }

    public void setNewsletterOptIn(boolean newsletterOptIn) {
        this.newsletterOptIn = newsletterOptIn;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public Integer getReservationIndex() {
        return reservationIndex;
    }

    public void setReservationIndex(Integer reservationIndex) {
        this.reservationIndex = reservationIndex;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getSourcePath() {
        return sourcePath;
    }

    public void setSourcePath(String sourcePath) {
        this.sourcePath = sourcePath;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
