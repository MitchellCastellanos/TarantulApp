package com.tarantulapp.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;

public class BehaviorLogRequest {

    @NotNull(message = "La fecha del registro es obligatoria")
    private LocalDateTime loggedAt;

    private String mood;   // calm | defensive | active | hiding | pre_molt
    private String notes;

    public LocalDateTime getLoggedAt() { return loggedAt; }
    public void setLoggedAt(LocalDateTime loggedAt) { this.loggedAt = loggedAt; }
    public String getMood() { return mood; }
    public void setMood(String mood) { this.mood = mood; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
