package com.tarantulapp.dto;

import java.time.Instant;
import java.util.UUID;

public class TimelineEventDTO {
    private UUID id;
    private String type;        // feeding | molt | behavior
    private Instant eventDate;
    private String title;
    private String summary;

    public TimelineEventDTO(UUID id, String type, Instant eventDate, String title, String summary) {
        this.id = id;
        this.type = type;
        this.eventDate = eventDate;
        this.title = title;
        this.summary = summary;
    }

    public UUID getId() { return id; }
    public String getType() { return type; }
    public Instant getEventDate() { return eventDate; }
    public String getTitle() { return title; }
    public String getSummary() { return summary; }
}
