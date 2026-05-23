package com.tarantulapp.service;

import com.tarantulapp.entity.TopVendorHistory;
import com.tarantulapp.entity.User;
import com.tarantulapp.repository.ListingEventRepository;
import com.tarantulapp.repository.TopVendorHistoryRepository;
import com.tarantulapp.repository.UserRepository;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * C2 — Top Vendor of the Month: live rolling leaderboard + monthly snapshots.
 */
@Service
public class TopVendorService {

    private static final Logger log = LoggerFactory.getLogger(TopVendorService.class);

    private final ListingEventRepository listingEventRepository;
    private final TopVendorHistoryRepository topVendorHistoryRepository;
    private final UserRepository userRepository;

    @Value("${app.top-vendor.min-views:100}")
    private long minViews = 100;

    @Value("${app.top-vendor.enabled:true}")
    private boolean schedulerEnabled = true;

    public TopVendorService(ListingEventRepository listingEventRepository,
                            TopVendorHistoryRepository topVendorHistoryRepository,
                            UserRepository userRepository) {
        this.listingEventRepository = listingEventRepository;
        this.topVendorHistoryRepository = topVendorHistoryRepository;
        this.userRepository = userRepository;
    }

    /** Rolling 30-day leaders for Discover strip and admin preview. */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getLiveTopVendors(int limit) {
        int cap = Math.min(Math.max(limit, 1), 10);
        Instant until = Instant.now();
        Instant since = until.minus(30, ChronoUnit.DAYS);
        return enrichRows(listingEventRepository.topSellersByTapRateBetween(since, until, minViews, cap));
    }

    /** Frozen winners for a calendar month (YYYY-MM). */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getHistoryForMonth(String monthYear) {
        if (monthYear == null || monthYear.isBlank()) {
            return List.of();
        }
        return topVendorHistoryRepository.findByMonthYearOrderByRankAsc(monthYear.trim()).stream()
                .map(this::mapHistoryRow)
                .toList();
    }

    /** Latest completed monthly snapshot (previous calendar month if available). */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getLatestSnapshot() {
        YearMonth previous = YearMonth.now(ZoneOffset.UTC).minusMonths(1);
        for (int i = 0; i < 6; i++) {
            YearMonth month = previous.minusMonths(i);
            List<TopVendorHistory> rows = topVendorHistoryRepository.findByMonthYearOrderByRankAsc(formatMonth(month));
            if (!rows.isEmpty()) {
                return rows.stream().map(this::mapHistoryRow).toList();
            }
        }
        return List.of();
    }

    @Scheduled(cron = "${app.top-vendor.cron:0 30 6 1 * *}")
    @SchedulerLock(name = "topVendorMonthlySnapshot", lockAtLeastFor = "PT5M", lockAtMostFor = "PT30M")
    @Transactional
    public void snapshotPreviousMonthScheduled() {
        if (!schedulerEnabled) {
            return;
        }
        YearMonth target = YearMonth.now(ZoneOffset.UTC).minusMonths(1);
        try {
            snapshotMonth(target);
        } catch (Exception ex) {
            log.warn("Top vendor monthly snapshot failed for {}: {}", target, ex.getMessage());
        }
    }

    @Transactional
    public List<Map<String, Object>> snapshotMonth(YearMonth month) {
        String monthKey = formatMonth(month);
        if (topVendorHistoryRepository.existsByMonthYear(monthKey)) {
            return getHistoryForMonth(monthKey);
        }
        Instant since = month.atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant until = month.plusMonths(1).atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        List<Object[]> leaders = listingEventRepository.topSellersByTapRateBetween(since, until, minViews, 3);
        if (leaders.isEmpty()) {
            return List.of();
        }
        short rank = 1;
        for (Object[] row : leaders) {
            UUID userId = (UUID) row[0];
            long views = ((Number) row[1]).longValue();
            long taps = ((Number) row[2]).longValue();
            TopVendorHistory entry = new TopVendorHistory();
            entry.setMonthYear(monthKey);
            entry.setRank(rank++);
            entry.setUserId(userId);
            entry.setViews30d(views);
            entry.setContactTaps30d(taps);
            entry.setContactTapRate(BigDecimal.valueOf(safeRate(taps, views)).setScale(6, RoundingMode.HALF_UP));
            topVendorHistoryRepository.save(entry);
        }
        log.info("Top vendor snapshot saved for {} ({} vendors)", monthKey, leaders.size());
        return getHistoryForMonth(monthKey);
    }

    private List<Map<String, Object>> enrichRows(List<Object[]> rows) {
        List<Map<String, Object>> out = new ArrayList<>();
        short rank = 1;
        for (Object[] row : rows) {
            UUID userId = (UUID) row[0];
            long views = ((Number) row[1]).longValue();
            long taps = ((Number) row[2]).longValue();
            User user = userRepository.findById(userId).orElse(null);
            if (user == null || user.getPublicHandle() == null || user.getPublicHandle().isBlank()) {
                continue;
            }
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("rank", rank++);
            map.put("userId", userId);
            map.put("handle", user.getPublicHandle());
            map.put("storefrontName", user.getStorefrontName() == null ? "" : user.getStorefrontName());
            map.put("displayName", user.getDisplayName() == null ? "" : user.getDisplayName());
            map.put("profilePhoto", user.getProfilePhoto() == null ? "" : user.getProfilePhoto());
            map.put("views30d", views);
            map.put("contactTaps30d", taps);
            map.put("contactTapRate", safeRate(taps, views));
            out.add(map);
        }
        return out;
    }

    private Map<String, Object> mapHistoryRow(TopVendorHistory h) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("rank", h.getRank());
        map.put("userId", h.getUserId());
        map.put("monthYear", h.getMonthYear());
        map.put("views30d", h.getViews30d());
        map.put("contactTaps30d", h.getContactTaps30d());
        map.put("contactTapRate", h.getContactTapRate() == null ? 0.0 : h.getContactTapRate().doubleValue());
        map.put("computedAt", h.getComputedAt());
        userRepository.findById(h.getUserId()).ifPresent(u -> {
            map.put("handle", u.getPublicHandle() == null ? "" : u.getPublicHandle());
            map.put("storefrontName", u.getStorefrontName() == null ? "" : u.getStorefrontName());
            map.put("displayName", u.getDisplayName() == null ? "" : u.getDisplayName());
            map.put("profilePhoto", u.getProfilePhoto() == null ? "" : u.getProfilePhoto());
        });
        return map;
    }

    private static String formatMonth(YearMonth month) {
        return month.toString();
    }

    private static double safeRate(long taps, long views) {
        if (views <= 0) return 0.0;
        return Math.round(((double) taps / (double) views) * 10000.0) / 10000.0;
    }
}
