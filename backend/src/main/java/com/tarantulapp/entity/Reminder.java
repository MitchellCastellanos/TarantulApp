package com.tarantulapp.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "reminders")
public class Reminder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "user_id", nullable = false, columnDefinition = "uuid")
    private UUID userId;

    @Column(name = "tarantula_id", columnDefinition = "uuid")
    private UUID tarantulaId;

    @Column(nullable = false, length = 30)
    private String type = "custom";

    @Column(name = "due_date", nullable = false)
    private LocalDateTime dueDate;

    @Column(length = 500)
    private String message;

    @Column(name = "is_done", nullable = false)
    private Boolean isDone = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() { createdAt = LocalDateTime.now(); }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public UUID getTarantulaId() { return tarantulaId; }
    public void setTarantulaId(UUID tarantulaId) { this.tarantulaId = tarantulaId; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public LocalDateTime getDueDate() { return dueDate; }
    public void setDueDate(LocalDateTime dueDate) { this.dueDate = dueDate; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Boolean getIsDone() { return isDone; }
    public void setIsDone(Boolean isDone) { this.isDone = isDone; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
