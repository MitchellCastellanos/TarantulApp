package com.tarantulapp.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "molt_logs")
public class MoltLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "tarantula_id", columnDefinition = "uuid", nullable = false)
    private UUID tarantulaId;

    @Column(name = "molted_at", nullable = false)
    private LocalDateTime moltedAt;

    @Column(name = "pre_size_cm", precision = 4, scale = 1)
    private BigDecimal preSizeCm;

    @Column(name = "post_size_cm", precision = 4, scale = 1)
    private BigDecimal postSizeCm;

    @Column(name = "notes", length = 500)
    private String notes;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTarantulaId() { return tarantulaId; }
    public void setTarantulaId(UUID tarantulaId) { this.tarantulaId = tarantulaId; }
    public LocalDateTime getMoltedAt() { return moltedAt; }
    public void setMoltedAt(LocalDateTime moltedAt) { this.moltedAt = moltedAt; }
    public BigDecimal getPreSizeCm() { return preSizeCm; }
    public void setPreSizeCm(BigDecimal preSizeCm) { this.preSizeCm = preSizeCm; }
    public BigDecimal getPostSizeCm() { return postSizeCm; }
    public void setPostSizeCm(BigDecimal postSizeCm) { this.postSizeCm = postSizeCm; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
