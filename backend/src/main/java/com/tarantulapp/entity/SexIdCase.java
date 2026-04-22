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

@Entity
@Table(name = "sex_id_cases")
public class SexIdCase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "author_user_id", nullable = false, columnDefinition = "uuid")
    private UUID authorUserId;

    @Column(length = 200)
    private String title;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "species_hint", length = 200)
    private String speciesHint;

    @Column(name = "stage", length = 20)
    private String stage;

    @Column(name = "image_type", length = 20)
    private String imageType;

    @Column(name = "ai_male_probability")
    private Double aiMaleProbability;

    @Column(name = "ai_confidence")
    private Double aiConfidence;

    @Column(name = "ai_confidence_label", length = 20)
    private String aiConfidenceLabel;

    @Column(name = "ai_explanation", length = 800)
    private String aiExplanation;

    @Column(name = "hidden_at")
    private Instant hiddenAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getAuthorUserId() { return authorUserId; }
    public void setAuthorUserId(UUID authorUserId) { this.authorUserId = authorUserId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public String getSpeciesHint() { return speciesHint; }
    public void setSpeciesHint(String speciesHint) { this.speciesHint = speciesHint; }
    public String getStage() { return stage; }
    public void setStage(String stage) { this.stage = stage; }
    public String getImageType() { return imageType; }
    public void setImageType(String imageType) { this.imageType = imageType; }
    public Double getAiMaleProbability() { return aiMaleProbability; }
    public void setAiMaleProbability(Double aiMaleProbability) { this.aiMaleProbability = aiMaleProbability; }
    public Double getAiConfidence() { return aiConfidence; }
    public void setAiConfidence(Double aiConfidence) { this.aiConfidence = aiConfidence; }
    public String getAiConfidenceLabel() { return aiConfidenceLabel; }
    public void setAiConfidenceLabel(String aiConfidenceLabel) { this.aiConfidenceLabel = aiConfidenceLabel; }
    public String getAiExplanation() { return aiExplanation; }
    public void setAiExplanation(String aiExplanation) { this.aiExplanation = aiExplanation; }
    public Instant getHiddenAt() { return hiddenAt; }
    public void setHiddenAt(Instant hiddenAt) { this.hiddenAt = hiddenAt; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
