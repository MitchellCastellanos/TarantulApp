package com.tarantulapp.dto;

import java.time.Instant;

public class InsightWeekBucketDTO {
    private final Instant weekStart;
    private final long count;

    public InsightWeekBucketDTO(Instant weekStart, long count) {
        this.weekStart = weekStart;
        this.count = count;
    }

    public Instant getWeekStart() {
        return weekStart;
    }

    public long getCount() {
        return count;
    }
}
