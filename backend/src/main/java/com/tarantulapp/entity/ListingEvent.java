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
@Table(name = "listing_events")
public class ListingEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "listing_id", columnDefinition = "uuid")
    private UUID listingId;

    /** {@code peer} = marketplace_listings, {@code partner} = partner_listings (same listing_id UUID space). */
    @Column(name = "listing_source", nullable = false, length = 16)
    private String listingSource = "peer";

    @Column(nullable = false, length = 32)
    private String kind;

    @Column(name = "anon_session_id", length = 64)
    private String anonSessionId;

    @Column(length = 8)
    private String country;

    @Column(name = "referrer_host", length = 128)
    private String referrerHost;

    @Column(name = "context_key", length = 128)
    private String contextKey;

    @Column(name = "utm_source", length = 64)
    private String utmSource;

    @Column(name = "utm_medium", length = 64)
    private String utmMedium;

    @Column(name = "utm_campaign", length = 96)
    private String utmCampaign;

    @Column(name = "actor_user_id", columnDefinition = "uuid")
    private UUID actorUserId;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt;

    @PrePersist
    void onCreate() {
        if (occurredAt == null) {
            occurredAt = Instant.now();
        }
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getListingId() { return listingId; }
    public void setListingId(UUID listingId) { this.listingId = listingId; }

    public String getListingSource() { return listingSource; }
    public void setListingSource(String listingSource) { this.listingSource = listingSource; }

    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }

    public String getAnonSessionId() { return anonSessionId; }
    public void setAnonSessionId(String anonSessionId) { this.anonSessionId = anonSessionId; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public String getReferrerHost() { return referrerHost; }
    public void setReferrerHost(String referrerHost) { this.referrerHost = referrerHost; }

    public String getContextKey() { return contextKey; }
    public void setContextKey(String contextKey) { this.contextKey = contextKey; }

    public String getUtmSource() { return utmSource; }
    public void setUtmSource(String utmSource) { this.utmSource = utmSource; }

    public String getUtmMedium() { return utmMedium; }
    public void setUtmMedium(String utmMedium) { this.utmMedium = utmMedium; }

    public String getUtmCampaign() { return utmCampaign; }
    public void setUtmCampaign(String utmCampaign) { this.utmCampaign = utmCampaign; }

    public UUID getActorUserId() { return actorUserId; }
    public void setActorUserId(UUID actorUserId) { this.actorUserId = actorUserId; }

    public Instant getOccurredAt() { return occurredAt; }
    public void setOccurredAt(Instant occurredAt) { this.occurredAt = occurredAt; }
}
