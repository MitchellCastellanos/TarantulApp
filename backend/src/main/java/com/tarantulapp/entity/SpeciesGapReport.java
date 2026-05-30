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

/** A species referenced by the platform that is missing from the taxonomic catalog. */
@Entity
@Table(name = "species_gap_reports")
public class SpeciesGapReport {

    public static final String OPEN = "open";
    public static final String RESOLVED = "resolved";
    public static final String DISMISSED = "dismissed";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "normalized_name", length = 180, nullable = false)
    private String normalizedName;

    @Column(name = "sample_raw_name", length = 180)
    private String sampleRawName;

    @Column(name = "source", length = 40, nullable = false)
    private String source = "partner_sync";

    @Column(name = "occurrences", nullable = false)
    private int occurrences = 1;

    @Column(name = "status", length = 20, nullable = false)
    private String status = OPEN;

    @Column(name = "resolved_species_id")
    private Integer resolvedSpeciesId;

    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "created_at", updatable = false, nullable = false)
    private Instant createdAt;

    @Column(name = "last_seen_at", nullable = false)
    private Instant lastSeenAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (lastSeenAt == null) lastSeenAt = now;
        if (status == null) status = OPEN;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getNormalizedName() { return normalizedName; }
    public void setNormalizedName(String normalizedName) { this.normalizedName = normalizedName; }
    public String getSampleRawName() { return sampleRawName; }
    public void setSampleRawName(String sampleRawName) { this.sampleRawName = sampleRawName; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public int getOccurrences() { return occurrences; }
    public void setOccurrences(int occurrences) { this.occurrences = occurrences; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Integer getResolvedSpeciesId() { return resolvedSpeciesId; }
    public void setResolvedSpeciesId(Integer resolvedSpeciesId) { this.resolvedSpeciesId = resolvedSpeciesId; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getLastSeenAt() { return lastSeenAt; }
    public void setLastSeenAt(Instant lastSeenAt) { this.lastSeenAt = lastSeenAt; }
    public Instant getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(Instant resolvedAt) { this.resolvedAt = resolvedAt; }
}
