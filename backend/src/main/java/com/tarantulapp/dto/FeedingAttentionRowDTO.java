package com.tarantulapp.dto;

import java.time.Instant;
import java.util.UUID;

public class FeedingAttentionRowDTO {
    private final UUID tarantulaId;
    private final String name;
    private final String shortId;
    private final Instant lastFedAt;
    /** Null when never successfully fed. */
    private final Long daysSinceLastFeed;

    public FeedingAttentionRowDTO(UUID tarantulaId, String name, String shortId,
                                  Instant lastFedAt, Long daysSinceLastFeed) {
        this.tarantulaId = tarantulaId;
        this.name = name;
        this.shortId = shortId;
        this.lastFedAt = lastFedAt;
        this.daysSinceLastFeed = daysSinceLastFeed;
    }

    public UUID getTarantulaId() {
        return tarantulaId;
    }

    public String getName() {
        return name;
    }

    public String getShortId() {
        return shortId;
    }

    public Instant getLastFedAt() {
        return lastFedAt;
    }

    public Long getDaysSinceLastFeed() {
        return daysSinceLastFeed;
    }
}
