package com.tarantulapp.service;

import com.tarantulapp.dto.CollectionInsightsResponse;
import com.tarantulapp.dto.FeedingAttentionRowDTO;
import com.tarantulapp.dto.InsightWeekBucketDTO;
import com.tarantulapp.repository.FeedingLogRepository;
import com.tarantulapp.repository.MoltLogRepository;
import com.tarantulapp.repository.TarantulaRepository;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class InsightsService {

    private static final int WEEKS_LOOKBACK = 12;

    private final FeedingLogRepository feedingLogRepository;
    private final MoltLogRepository moltLogRepository;
    private final TarantulaRepository tarantulaRepository;

    public InsightsService(FeedingLogRepository feedingLogRepository,
                          MoltLogRepository moltLogRepository,
                          TarantulaRepository tarantulaRepository) {
        this.feedingLogRepository = feedingLogRepository;
        this.moltLogRepository = moltLogRepository;
        this.tarantulaRepository = tarantulaRepository;
    }

    public CollectionInsightsResponse getCollectionInsights(UUID userId) {
        Instant now = Instant.now();
        Instant weekCutoff = now.minus(WEEKS_LOOKBACK * 7L, ChronoUnit.DAYS);
        Instant thirtyDays = now.minus(30, ChronoUnit.DAYS);
        Instant ninetyDays = now.minus(90, ChronoUnit.DAYS);
        LocalDate todayUtc = LocalDate.now(ZoneOffset.UTC);

        CollectionInsightsResponse resp = new CollectionInsightsResponse();
        resp.setActiveSpiderCount(tarantulaRepository.countByUserIdAndDeceasedAtIsNull(userId));
        resp.setTotalFeedingLogs(feedingLogRepository.countByOwnerUserId(userId));
        resp.setTotalMoltLogs(moltLogRepository.countByOwnerUserId(userId));
        resp.setFeedsLast30Days(feedingLogRepository.countSuccessfulFeedingsSince(userId, thirtyDays));
        resp.setMoltsLast90Days(moltLogRepository.countMoltsSince(userId, ninetyDays));

        resp.setFeedingsByWeek(mapWeekBuckets(feedingLogRepository.countSuccessfulFeedingsByWeekNative(userId,
                weekCutoff)));
        resp.setMoltsByWeek(mapWeekBuckets(moltLogRepository.countMoltsByWeekNative(userId, weekCutoff)));

        resp.setFeedingAttention(mapAttentionRows(tarantulaRepository.findFeedingAttentionRows(userId), todayUtc));

        return resp;
    }

    private List<InsightWeekBucketDTO> mapWeekBuckets(List<Object[]> rows) {
        if (rows == null || rows.isEmpty()) {
            return List.of();
        }
        List<InsightWeekBucketDTO> out = new ArrayList<>(rows.size());
        for (Object[] r : rows) {
            if (r.length < 2 || r[0] == null) {
                continue;
            }
            Instant wkStart = coerceToInstant(r[0]);
            if (wkStart == null) {
                continue;
            }
            long c = r[1] instanceof Number ? ((Number) r[1]).longValue() : 0;
            out.add(new InsightWeekBucketDTO(wkStart, c));
        }
        return out;
    }

    private Instant coerceToInstant(Object o) {
        if (o instanceof Instant instant) {
            return instant;
        }
        if (o instanceof Timestamp ts) {
            return ts.toInstant();
        }
        return null;
    }

    private List<FeedingAttentionRowDTO> mapAttentionRows(List<Object[]> rows, LocalDate todayUtc) {
        if (rows == null || rows.isEmpty()) {
            return List.of();
        }
        List<FeedingAttentionRowDTO> out = new ArrayList<>(rows.size());
        for (Object[] r : rows) {
            if (r.length < 4) {
                continue;
            }
            UUID id = (UUID) r[0];
            String name = r[1] != null ? r[1].toString() : "";
            String shortId = r[2] != null ? r[2].toString() : "";
            Instant lastFed = r[3] != null ? coerceToInstant(r[3]) : null;
            Long daysSince = null;
            if (lastFed != null) {
                LocalDate fedDay = lastFed.atZone(ZoneOffset.UTC).toLocalDate();
                daysSince = ChronoUnit.DAYS.between(fedDay, todayUtc);
            }
            out.add(new FeedingAttentionRowDTO(id, name, shortId, lastFed, daysSince));
        }
        return out;
    }
}
