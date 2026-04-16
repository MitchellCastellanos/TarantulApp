package com.tarantulapp.dto;

import java.time.LocalDateTime;

public class DeceasedRequest {
    private LocalDateTime deceasedAt;  // null → usa now()
    private String notes;

    public LocalDateTime getDeceasedAt() { return deceasedAt; }
    public void setDeceasedAt(LocalDateTime deceasedAt) { this.deceasedAt = deceasedAt; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
