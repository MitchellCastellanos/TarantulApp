package com.tarantulapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "top_vendors_history")
public class TopVendorHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "month_year", nullable = false, length = 7)
    private String monthYear;

    @Column(nullable = false)
    private short rank;

    @Column(name = "user_id", nullable = false, columnDefinition = "uuid")
    private UUID userId;

    @Column(name = "contact_tap_rate", nullable = false, precision = 10, scale = 6)
    private BigDecimal contactTapRate = BigDecimal.ZERO;

    @Column(name = "views_30d", nullable = false)
    private long views30d;

    @Column(name = "contact_taps_30d", nullable = false)
    private long contactTaps30d;

    @Column(name = "computed_at", nullable = false, updatable = false)
    private Instant computedAt;

    @PrePersist
    void onCreate() {
        if (computedAt == null) {
            computedAt = Instant.now();
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getMonthYear() { return monthYear; }
    public void setMonthYear(String monthYear) { this.monthYear = monthYear; }

    public short getRank() { return rank; }
    public void setRank(short rank) { this.rank = rank; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public BigDecimal getContactTapRate() { return contactTapRate; }
    public void setContactTapRate(BigDecimal contactTapRate) { this.contactTapRate = contactTapRate; }

    public long getViews30d() { return views30d; }
    public void setViews30d(long views30d) { this.views30d = views30d; }

    public long getContactTaps30d() { return contactTaps30d; }
    public void setContactTaps30d(long contactTaps30d) { this.contactTaps30d = contactTaps30d; }

    public Instant getComputedAt() { return computedAt; }
    public void setComputedAt(Instant computedAt) { this.computedAt = computedAt; }
}
