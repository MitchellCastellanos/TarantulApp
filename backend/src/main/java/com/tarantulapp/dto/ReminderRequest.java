package com.tarantulapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.UUID;

public class ReminderRequest {

    @NotBlank
    private String type;

    @NotNull
    private LocalDateTime dueDate;

    private String message;
    private UUID tarantulaId;

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public LocalDateTime getDueDate() { return dueDate; }
    public void setDueDate(LocalDateTime dueDate) { this.dueDate = dueDate; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public UUID getTarantulaId() { return tarantulaId; }
    public void setTarantulaId(UUID tarantulaId) { this.tarantulaId = tarantulaId; }
}
