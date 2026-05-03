package com.tarantulapp.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
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
    private Instant moltedAt;

    @Column(name = "pre_size_cm", precision = 4, scale = 1)
    private BigDecimal preSizeCm;

    @Column(name = "post_size_cm", precision = 4, scale = 1)
    private BigDecimal postSizeCm;

    @Column(name = "notes", length = 500)
    private String notes;

    @Column(name = "successful")
    private Boolean successful;

    @Column(name = "complication_type", length = 50)
    private String complicationType;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Column(name = "pre_molt_signs", columnDefinition = "TEXT")
    private String preMoltSigns;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() { createdAt = Instant.now(); }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTarantulaId() { return tarantulaId; }
    public void setTarantulaId(UUID tarantulaId) { this.tarantulaId = tarantulaId; }
    public Instant getMoltedAt() { return moltedAt; }
    public void setMoltedAt(Instant moltedAt) { this.moltedAt = moltedAt; }
    public BigDecimal getPreSizeCm() { return preSizeCm; }
    public void setPreSizeCm(BigDecimal preSizeCm) { this.preSizeCm = preSizeCm; }
    public BigDecimal getPostSizeCm() { return postSizeCm; }
    public void setPostSizeCm(BigDecimal postSizeCm) { this.postSizeCm = postSizeCm; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Boolean getSuccessful() { return successful; }
    public void setSuccessful(Boolean successful) { this.successful = successful; }
    public String getComplicationType() { return complicationType; }
    public void setComplicationType(String complicationType) { this.complicationType = complicationType; }
    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }
    public String getPreMoltSigns() { return preMoltSigns; }
    public void setPreMoltSigns(String preMoltSigns) { this.preMoltSigns = preMoltSigns; }
    public Instant getCreatedAt() { return createdAt; }
}
