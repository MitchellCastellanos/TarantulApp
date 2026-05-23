package com.tarantulapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "species_trade_notes")
public class SpeciesTradeNote {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "species_id", nullable = false)
    private Integer speciesId;

    @Column(nullable = false, length = 64)
    private String country;

    @Column(name = "cites_appendix", length = 16)
    private String citesAppendix;

    @Column(name = "lacey_status", length = 32)
    private String laceyStatus;

    @Column(name = "notes_md", columnDefinition = "TEXT")
    private String notesMd;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void touchUpdatedAt() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Integer getSpeciesId() { return speciesId; }
    public void setSpeciesId(Integer speciesId) { this.speciesId = speciesId; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public String getCitesAppendix() { return citesAppendix; }
    public void setCitesAppendix(String citesAppendix) { this.citesAppendix = citesAppendix; }

    public String getLaceyStatus() { return laceyStatus; }
    public void setLaceyStatus(String laceyStatus) { this.laceyStatus = laceyStatus; }

    public String getNotesMd() { return notesMd; }
    public void setNotesMd(String notesMd) { this.notesMd = notesMd; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
