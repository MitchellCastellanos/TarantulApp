package com.tarantulapp.dto;

import com.tarantulapp.entity.Reminder;
import java.time.LocalDateTime;
import java.util.UUID;

public class ReminderResponse {
    private UUID id;
    private UUID tarantulaId;
    private String tarantulaName;
    private String type;
    private String source;
    private LocalDateTime dueDate;
    private String message;
    private Boolean isDone;
    private LocalDateTime createdAt;

    public static ReminderResponse from(Reminder r) {
        ReminderResponse dto = new ReminderResponse();
        dto.id = r.getId();
        dto.tarantulaId = r.getTarantulaId();
        dto.type = r.getType();
        dto.source = "manual";
        dto.dueDate = r.getDueDate();
        dto.message = r.getMessage();
        dto.isDone = r.getIsDone();
        dto.createdAt = r.getCreatedAt();
        return dto;
    }

    public static ReminderResponse automatic(UUID tarantulaId, String tarantulaName, String type,
                                             LocalDateTime dueDate, String message) {
        ReminderResponse dto = new ReminderResponse();
        dto.tarantulaId = tarantulaId;
        dto.tarantulaName = tarantulaName;
        dto.type = type;
        dto.source = "automatic";
        dto.dueDate = dueDate;
        dto.message = message;
        dto.isDone = false;
        return dto;
    }

    public UUID getId() { return id; }
    public UUID getTarantulaId() { return tarantulaId; }
    public String getTarantulaName() { return tarantulaName; }
    public String getType() { return type; }
    public String getSource() { return source; }
    public LocalDateTime getDueDate() { return dueDate; }
    public String getMessage() { return message; }
    public Boolean getIsDone() { return isDone; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    public void setTarantulaName(String tarantulaName) { this.tarantulaName = tarantulaName; }
}
