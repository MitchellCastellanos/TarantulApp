package com.tarantulapp.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "photos")
public class Photo {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "tarantula_id", nullable = false, columnDefinition = "uuid")
    private UUID tarantulaId;

    @Column(name = "file_path", nullable = false, length = 500)
    private String filePath;

    @Column(length = 255)
    private String caption;

    @Column(name = "taken_at")
    private LocalDateTime takenAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() { createdAt = LocalDateTime.now(); }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getTarantulaId() { return tarantulaId; }
    public void setTarantulaId(UUID tarantulaId) { this.tarantulaId = tarantulaId; }
    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }
    public String getCaption() { return caption; }
    public void setCaption(String caption) { this.caption = caption; }
    public LocalDateTime getTakenAt() { return takenAt; }
    public void setTakenAt(LocalDateTime takenAt) { this.takenAt = takenAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
