package com.tarantulapp.dto;

import com.tarantulapp.entity.Photo;
import java.time.LocalDateTime;
import java.util.UUID;

public class PhotoResponse {
    private UUID id;
    private String filePath;
    private String caption;
    private LocalDateTime takenAt;
    private LocalDateTime createdAt;
    private long spoodCount;
    private boolean spoodedByViewer;

    public static PhotoResponse from(Photo p) {
        PhotoResponse r = new PhotoResponse();
        r.id = p.getId();
        r.filePath = p.getFilePath();
        r.caption = p.getCaption();
        r.takenAt = p.getTakenAt();
        r.createdAt = p.getCreatedAt();
        return r;
    }

    public UUID getId() { return id; }
    public String getFilePath() { return filePath; }
    public String getCaption() { return caption; }
    public LocalDateTime getTakenAt() { return takenAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public long getSpoodCount() { return spoodCount; }
    public void setSpoodCount(long spoodCount) { this.spoodCount = spoodCount; }
    public boolean isSpoodedByViewer() { return spoodedByViewer; }
    public void setSpoodedByViewer(boolean spoodedByViewer) { this.spoodedByViewer = spoodedByViewer; }
}
