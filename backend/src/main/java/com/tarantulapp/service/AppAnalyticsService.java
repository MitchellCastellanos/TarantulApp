package com.tarantulapp.service;

import com.tarantulapp.entity.AppVisit;
import com.tarantulapp.repository.AppVisitRepository;
import com.tarantulapp.security.RateLimiter;
import com.tarantulapp.util.SecurityHelper;
import com.tarantulapp.util.TimezoneGeo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;

/**
 * App-wide usage analytics: records one aggregated row per client session
 * ("visit") and serves the admin dashboard aggregates (visits, time spent,
 * breakdown by country/city/platform, daily trend).
 *
 * Privacy: no raw IP is stored. Country/city come from edge geo headers when
 * present, else from the client IANA timezone (see {@link TimezoneGeo}).
 */
@Service
public class AppAnalyticsService {

    private static final int MAX_EVENTS_PER_MIN = 120;
    /** Upper bound on engaged seconds a single heartbeat may add — guards against inflation. */
    private static final long MAX_ENGAGED_PER_EVENT = 600L;
    /** Cap on rows scanned for an admin overview to keep aggregation bounded. */
    private static final int MAX_ROWS = 100_000;
    private static final int TOP_LIMIT = 25;

    private final AppVisitRepository repository;
    private final SecurityHelper securityHelper;
    private final RateLimiter rateLimiter;

    public AppAnalyticsService(AppVisitRepository repository,
                               SecurityHelper securityHelper,
                               RateLimiter rateLimiter) {
        this.repository = repository;
        this.securityHelper = securityHelper;
        this.rateLimiter = rateLimiter;
    }

    /** Client-supplied + header-derived context for a single analytics event. */
    public record EventInput(
            String sessionId,
            boolean pageView,
            long engagedSeconds,
            String path,
            String referrerHost,
            String timezone,
            String locale,
            String platform,
            String appVersion,
            String headerCountryCode,
            String headerCountry,
            String headerCity,
            String headerRegion) {}

    /** Records or updates a visit. Returns true if persisted, false if ignored/rate-limited. */
    @Transactional
    public boolean record(EventInput in) {
        if (in == null) {
            return false;
        }
        String session = trim(in.sessionId(), 64);
        if (session == null) {
            return false;
        }
        if (!rateLimiter.allow("app_visits|" + session, MAX_EVENTS_PER_MIN, Duration.ofMinutes(1))) {
            return false;
        }
        long engaged = clamp(in.engagedSeconds(), 0, MAX_ENGAGED_PER_EVENT);
        UUID userId = securityHelper.tryGetCurrentUserId().orElse(null);
        Instant now = Instant.now();

        AppVisit existing = repository.findBySessionId(session).orElse(null);
        if (existing != null) {
            applyUpdate(existing, now, engaged, in.pageView(), userId);
            repository.save(existing);
            return true;
        }
        // First event for this session creates the row. A concurrent first event for the
        // same brand-new session id (very rare) would hit the unique constraint at commit;
        // recording is best-effort, so we let that propagate to the controller, which swallows it.
        repository.save(buildNew(session, now, engaged, userId, in));
        return true;
    }

    private void applyUpdate(AppVisit v, Instant now, long engaged, boolean pageView, UUID userId) {
        v.setLastSeenAt(now);
        if (engaged > 0) {
            v.setDurationSeconds(v.getDurationSeconds() + engaged);
        }
        if (pageView && v.getPageViews() < 1_000_000) {
            v.setPageViews(v.getPageViews() + 1);
        }
        if (v.getUserId() == null && userId != null) {
            v.setUserId(userId);
        }
    }

    private AppVisit buildNew(String session, Instant now, long engaged, UUID userId, EventInput in) {
        AppVisit v = new AppVisit();
        v.setSessionId(session);
        v.setUserId(userId);
        v.setFirstSeenAt(now);
        v.setLastSeenAt(now);
        v.setDurationSeconds(engaged);
        v.setPageViews(1);
        v.setTimezone(trim(in.timezone(), 64));
        v.setLocale(trim(in.locale(), 16));
        v.setPlatform(normalizePlatform(in.platform()));
        v.setAppVersion(trim(in.appVersion(), 40));
        v.setLandingPath(trim(in.path(), 300));
        v.setReferrerHost(trim(in.referrerHost(), 160));
        resolveGeo(v, in);
        return v;
    }

    private void resolveGeo(AppVisit v, EventInput in) {
        // Country: prefer edge header, else derive from timezone.
        String code = normalizeCode(in.headerCountryCode());
        if (code == null) {
            code = TimezoneGeo.countryCodeForZone(in.timezone());
        }
        v.setCountryCode(code);
        String name = TimezoneGeo.countryName(code);
        if (name == null) {
            name = trim(in.headerCountry(), 80);
        }
        v.setCountry(name);
        // City: prefer edge header, else representative city from the timezone.
        String city = trim(in.headerCity(), 120);
        if (city == null) {
            city = trim(TimezoneGeo.cityForZone(in.timezone()), 120);
        }
        v.setCity(city);
        v.setRegion(trim(in.headerRegion(), 120));
    }

    // ─── Admin overview ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> adminOverview(String range) {
        String normalizedRange = normalizeRange(range);
        Instant since = sinceFor(normalizedRange);
        List<AppVisit> visits = (since == null)
                ? repository.findAllNewestFirst(org.springframework.data.domain.PageRequest.of(0, MAX_ROWS))
                : repository.findStartedSince(since, org.springframework.data.domain.PageRequest.of(0, MAX_ROWS));

        long sessions = visits.size();
        long pageViews = 0;
        long engagedSeconds = 0;
        Set<UUID> registeredVisitors = new HashSet<>();

        Map<String, long[]> byCountry = new LinkedHashMap<>();   // [sessions, engaged, pageViews]
        Map<String, String> countryCodeByName = new LinkedHashMap<>();
        Map<String, long[]> byCity = new LinkedHashMap<>();       // key "city||country" → [sessions, engaged]
        Map<String, String> cityCountry = new LinkedHashMap<>();
        Map<String, Long> byPlatform = new LinkedHashMap<>();
        TreeMap<String, long[]> byDay = new TreeMap<>();          // day → [sessions, pageViews]

        for (AppVisit v : visits) {
            pageViews += v.getPageViews();
            engagedSeconds += v.getDurationSeconds();
            if (v.getUserId() != null) {
                registeredVisitors.add(v.getUserId());
            }

            String country = blankToUnknown(v.getCountry());
            long[] cAgg = byCountry.computeIfAbsent(country, k -> new long[3]);
            cAgg[0] += 1;
            cAgg[1] += v.getDurationSeconds();
            cAgg[2] += v.getPageViews();
            if (v.getCountryCode() != null && !countryCodeByName.containsKey(country)) {
                countryCodeByName.put(country, v.getCountryCode());
            }

            String cityName = blankToUnknown(v.getCity());
            String cityKey = cityName + "||" + country;
            long[] cityAgg = byCity.computeIfAbsent(cityKey, k -> new long[2]);
            cityAgg[0] += 1;
            cityAgg[1] += v.getDurationSeconds();
            cityCountry.putIfAbsent(cityKey, country);

            String platform = blankToUnknown(v.getPlatform());
            byPlatform.merge(platform, 1L, Long::sum);

            String day = LocalDate.ofInstant(v.getFirstSeenAt(), ZoneOffset.UTC).toString();
            long[] dAgg = byDay.computeIfAbsent(day, k -> new long[2]);
            dAgg[0] += 1;
            dAgg[1] += v.getPageViews();
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("range", normalizedRange);
        out.put("since", since == null ? null : since.toString());
        out.put("visits", sessions);
        out.put("pageViews", pageViews);
        out.put("registeredVisitors", (long) registeredVisitors.size());
        out.put("totalEngagedSeconds", engagedSeconds);
        out.put("avgSessionSeconds", sessions > 0 ? Math.round((double) engagedSeconds / sessions) : 0L);

        out.put("byCountry", topCountries(byCountry, countryCodeByName));
        out.put("byCity", topCities(byCity, cityCountry));
        out.put("byPlatform", platformRows(byPlatform));
        out.put("byDay", dayRows(byDay));
        return out;
    }

    private List<Map<String, Object>> topCountries(Map<String, long[]> byCountry, Map<String, String> codes) {
        return byCountry.entrySet().stream()
                .sorted(Comparator.comparingLong((Map.Entry<String, long[]> e) -> e.getValue()[0]).reversed())
                .limit(TOP_LIMIT)
                .map(e -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("country", e.getKey());
                    row.put("countryCode", codes.get(e.getKey()));
                    row.put("visits", e.getValue()[0]);
                    row.put("engagedSeconds", e.getValue()[1]);
                    row.put("pageViews", e.getValue()[2]);
                    return row;
                })
                .toList();
    }

    private List<Map<String, Object>> topCities(Map<String, long[]> byCity, Map<String, String> cityCountry) {
        return byCity.entrySet().stream()
                .sorted(Comparator.comparingLong((Map.Entry<String, long[]> e) -> e.getValue()[0]).reversed())
                .limit(TOP_LIMIT)
                .map(e -> {
                    String city = e.getKey().contains("||") ? e.getKey().substring(0, e.getKey().indexOf("||")) : e.getKey();
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("city", city);
                    row.put("country", cityCountry.get(e.getKey()));
                    row.put("visits", e.getValue()[0]);
                    row.put("engagedSeconds", e.getValue()[1]);
                    return row;
                })
                .toList();
    }

    private List<Map<String, Object>> platformRows(Map<String, Long> byPlatform) {
        return byPlatform.entrySet().stream()
                .sorted(Comparator.comparingLong(Map.Entry<String, Long>::getValue).reversed())
                .map(e -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("platform", e.getKey());
                    row.put("visits", e.getValue());
                    return row;
                })
                .toList();
    }

    private List<Map<String, Object>> dayRows(TreeMap<String, long[]> byDay) {
        List<Map<String, Object>> rows = new ArrayList<>(byDay.size());
        for (Map.Entry<String, long[]> e : byDay.entrySet()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("day", e.getKey());
            row.put("visits", e.getValue()[0]);
            row.put("pageViews", e.getValue()[1]);
            rows.add(row);
        }
        return rows;
    }

    // ─── helpers ─────────────────────────────────────────────────────────────────

    private static String normalizeRange(String range) {
        if (range == null) {
            return "30d";
        }
        String r = range.trim().toLowerCase(Locale.ROOT);
        return switch (r) {
            case "7d", "30d", "90d", "all" -> r;
            default -> "30d";
        };
    }

    private static Instant sinceFor(String normalizedRange) {
        return switch (normalizedRange) {
            case "7d" -> Instant.now().minus(7, ChronoUnit.DAYS);
            case "90d" -> Instant.now().minus(90, ChronoUnit.DAYS);
            case "all" -> null;
            default -> Instant.now().minus(30, ChronoUnit.DAYS);
        };
    }

    private static String normalizePlatform(String raw) {
        if (raw == null) {
            return null;
        }
        String p = raw.trim().toLowerCase(Locale.ROOT);
        return switch (p) {
            case "web", "android", "ios" -> p;
            case "" -> null;
            default -> trim(p, 16);
        };
    }

    private static String normalizeCode(String raw) {
        if (raw == null) {
            return null;
        }
        String c = raw.trim().toUpperCase(Locale.ROOT);
        return (c.length() == 2 && c.chars().allMatch(Character::isLetter)) ? c : null;
    }

    private static String blankToUnknown(String v) {
        return (v == null || v.isBlank()) ? "Unknown" : v;
    }

    private static long clamp(long v, long min, long max) {
        return Math.max(min, Math.min(max, v));
    }

    private static String trim(String v, int max) {
        if (v == null) {
            return null;
        }
        String t = v.trim();
        if (t.isEmpty()) {
            return null;
        }
        return t.length() <= max ? t : t.substring(0, max);
    }
}
