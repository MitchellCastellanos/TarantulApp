package com.tarantulapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "pro_day_grants")
public class ProDayGrant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", columnDefinition = "uuid", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private Integer days;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private ProDayGrantSource source;

    @Column(length = 500)
    private String reason;

    @Column(name = "granted_by_admin_id", columnDefinition = "uuid")
    private UUID grantedByAdminId;

    @Column(name = "granted_at", nullable = false)
    private LocalDateTime grantedAt;

    @PrePersist
    void onCreate() {
        if (grantedAt == null) {
            grantedAt = LocalDateTime.now();
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public Integer getDays() { return days; }
    public void setDays(Integer days) { this.days = days; }

    public ProDayGrantSource getSource() { return source; }
    public void setSource(ProDayGrantSource source) { this.source = source; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public UUID getGrantedByAdminId() { return grantedByAdminId; }
    public void setGrantedByAdminId(UUID grantedByAdminId) { this.grantedByAdminId = grantedByAdminId; }

    public LocalDateTime getGrantedAt() { return grantedAt; }
    public void setGrantedAt(LocalDateTime grantedAt) { this.grantedAt = grantedAt; }
}
