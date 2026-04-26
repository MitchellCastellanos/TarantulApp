package com.tarantulapp.dto;

public class SpoodToggleResponse {
    private long spoodCount;
    private boolean spoodedByViewer;

    public SpoodToggleResponse(long spoodCount, boolean spoodedByViewer) {
        this.spoodCount = spoodCount;
        this.spoodedByViewer = spoodedByViewer;
    }

    public long getSpoodCount() {
        return spoodCount;
    }

    public boolean isSpoodedByViewer() {
        return spoodedByViewer;
    }
}
