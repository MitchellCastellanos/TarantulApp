package com.tarantulapp.dto;

import com.tarantulapp.entity.Reminder;
import java.time.LocalDateTime;
import java.util.UUID;

public class ReminderResponse {
    private UUID id;
    private UUID tarantulaId;
    private String type;
    private LocalDateTime dueDate;
    private String message;
    private Boolean isDone;
    private LocalDateTime createdAt;

    public static ReminderResponse from(Reminder r) {
        ReminderResponse dto = new ReminderResponse();
        dto.id = r.getId();
        dto.tarantulaId = r.getTarantulaId();
        dto.type = r.getType();
        dto.dueDate = r.getDueDate();
        dto.message = r.getMessage();
        dto.isDone = r.getIsDone();
        dto.createdAt = r.getCreatedAt();
        return dto;
    }

    public UUID getId() { return id; }
    public UUID getTarantulaId() { return tarantulaId; }
    public String getType() { return type; }
    public LocalDateTime getDueDate() { return dueDate; }
    public String getMessage() { return message; }
    public Boolean getIsDone() { return isDone; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
