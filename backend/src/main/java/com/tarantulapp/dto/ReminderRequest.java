package com.tarantulapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.OffsetDateTime;
import java.util.UUID;

public class ReminderRequest {

    @NotBlank
    private String type;

    @NotNull
    private OffsetDateTime dueDate;

    private String message;
    @NotNull
    private UUID tarantulaId;

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public OffsetDateTime getDueDate() { return dueDate; }
    public void setDueDate(OffsetDateTime dueDate) { this.dueDate = dueDate; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public UUID getTarantulaId() { return tarantulaId; }
    public void setTarantulaId(UUID tarantulaId) { this.tarantulaId = tarantulaId; }
}
