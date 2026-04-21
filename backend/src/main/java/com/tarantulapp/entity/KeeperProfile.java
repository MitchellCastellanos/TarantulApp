package com.tarantulapp.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "keeper_profiles")
public class KeeperProfile {

    @Id
    @Column(name = "user_id", columnDefinition = "uuid")
    private UUID userId;

    @Column(length = 60)
    private String handle;

    @Column(length = 500)
    private String bio;

    @Column(length = 140)
    private String location;

    @Column(name = "featured_collection", length = 180)
    private String featuredCollection;

    @Column(name = "contact_whatsapp", length = 80)
    private String contactWhatsapp;

    @Column(name = "contact_instagram", length = 80)
    private String contactInstagram;

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

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public String getHandle() { return handle; }
    public void setHandle(String handle) { this.handle = handle; }
    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getFeaturedCollection() { return featuredCollection; }
    public void setFeaturedCollection(String featuredCollection) { this.featuredCollection = featuredCollection; }
    public String getContactWhatsapp() { return contactWhatsapp; }
    public void setContactWhatsapp(String contactWhatsapp) { this.contactWhatsapp = contactWhatsapp; }
    public String getContactInstagram() { return contactInstagram; }
    public void setContactInstagram(String contactInstagram) { this.contactInstagram = contactInstagram; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
