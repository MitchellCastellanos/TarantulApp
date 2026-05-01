package com.tarantulapp.dto;

import java.util.List;

public class CollectionInsightsResponse {
    private long activeSpiderCount;
    private long totalFeedingLogs;
    private long totalMoltLogs;
    private long feedsLast30Days;
    private long moltsLast90Days;
    private List<InsightWeekBucketDTO> feedingsByWeek;
    private List<InsightWeekBucketDTO> moltsByWeek;
    private List<FeedingAttentionRowDTO> feedingAttention;

    public long getActiveSpiderCount() {
        return activeSpiderCount;
    }

    public void setActiveSpiderCount(long activeSpiderCount) {
        this.activeSpiderCount = activeSpiderCount;
    }

    public long getTotalFeedingLogs() {
        return totalFeedingLogs;
    }

    public void setTotalFeedingLogs(long totalFeedingLogs) {
        this.totalFeedingLogs = totalFeedingLogs;
    }

    public long getTotalMoltLogs() {
        return totalMoltLogs;
    }

    public void setTotalMoltLogs(long totalMoltLogs) {
        this.totalMoltLogs = totalMoltLogs;
    }

    public long getFeedsLast30Days() {
        return feedsLast30Days;
    }

    public void setFeedsLast30Days(long feedsLast30Days) {
        this.feedsLast30Days = feedsLast30Days;
    }

    public long getMoltsLast90Days() {
        return moltsLast90Days;
    }

    public void setMoltsLast90Days(long moltsLast90Days) {
        this.moltsLast90Days = moltsLast90Days;
    }

    public List<InsightWeekBucketDTO> getFeedingsByWeek() {
        return feedingsByWeek;
    }

    public void setFeedingsByWeek(List<InsightWeekBucketDTO> feedingsByWeek) {
        this.feedingsByWeek = feedingsByWeek;
    }

    public List<InsightWeekBucketDTO> getMoltsByWeek() {
        return moltsByWeek;
    }

    public void setMoltsByWeek(List<InsightWeekBucketDTO> moltsByWeek) {
        this.moltsByWeek = moltsByWeek;
    }

    public List<FeedingAttentionRowDTO> getFeedingAttention() {
        return feedingAttention;
    }

    public void setFeedingAttention(List<FeedingAttentionRowDTO> feedingAttention) {
        this.feedingAttention = feedingAttention;
    }
}
