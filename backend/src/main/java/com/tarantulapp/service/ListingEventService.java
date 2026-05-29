package com.tarantulapp.service;

import com.tarantulapp.entity.ListingEvent;
import com.tarantulapp.entity.MarketplaceListing;
import com.tarantulapp.entity.PartnerListingStatus;
import com.tarantulapp.repository.ListingEventRepository;
import com.tarantulapp.repository.MarketplaceListingRepository;
import com.tarantulapp.repository.OfficialVendorRepository;
import com.tarantulapp.repository.PartnerListingRepository;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.security.RateLimiter;
import com.tarantulapp.util.SecurityHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Anonymous marketplace listing event tracking — vendor analytics (A1).
 *
 * Events are stored without any user FK by default (so we never link a viewer
 * UUID to a tarantula browsing pattern). For authenticated users we capture
 * actor_user_id only to power moderation and to dedupe seller's own views.
 */
@Service
public class ListingEventService {

    /** Whitelist of event kinds the public endpoint will accept. */
    private static final Set<String> ALLOWED_KINDS = Set.of(
            "view",
            "card_click",
            "storefront_view",
            "contact_tap",
            "contact_tap_message",
            "contact_tap_store",
            "contact_tap_cart",
            "contact_tap_external",
            "share_open",
            "share_download"
    );

    /** General flood control on the anonymous endpoint. */
    private static final int ANON_MAX_EVENTS_PER_MIN = 60;

    private static final String SOURCE_PEER = "peer";
    private static final String SOURCE_PARTNER = "partner";

    private final ListingEventRepository listingEventRepository;
    private final MarketplaceListingRepository marketplaceListingRepository;
    private final PartnerListingRepository partnerListingRepository;
    private final OfficialVendorRepository officialVendorRepository;
    private final UserRepository userRepository;
    private final SecurityHelper securityHelper;
    private final RateLimiter rateLimiter;

    public ListingEventService(ListingEventRepository listingEventRepository,
                               MarketplaceListingRepository marketplaceListingRepository,
                               PartnerListingRepository partnerListingRepository,
                               OfficialVendorRepository officialVendorRepository,
                               UserRepository userRepository,
                               SecurityHelper securityHelper,
                               RateLimiter rateLimiter) {
        this.listingEventRepository = listingEventRepository;
        this.marketplaceListingRepository = marketplaceListingRepository;
        this.partnerListingRepository = partnerListingRepository;
        this.officialVendorRepository = officialVendorRepository;
        this.userRepository = userRepository;
        this.securityHelper = securityHelper;
        this.rateLimiter = rateLimiter;
    }

    /**
     * Records a listing event from the anonymous public endpoint.
     * Returns true if persisted; false if rate-limited or unknown kind.
     */
    @Transactional
    public boolean recordEvent(UUID listingId, String rawKind, String anonSessionId,
                                String country, String referrerHost,
                                String utmSource, String utmMedium, String utmCampaign) {
        if (listingId == null) {
            return false;
        }
        String kind = normalizeKind(rawKind);
        if (kind == null || !rateLimit(anonSessionId)) {
            return false;
        }
        String listingSource = resolveListingSource(listingId);
        if (listingSource == null) {
            return false;
        }
        return persistEvent(listingId, listingSource, kind, anonSessionId, country, referrerHost,
                null, utmSource, utmMedium, utmCampaign);
    }

    @Transactional
    public boolean recordStorefrontEvent(String contextType, String contextKey, String rawKind,
                                         String anonSessionId, String country, String referrerHost) {
        String kind = normalizeKind(rawKind);
        if (!"storefront_view".equals(kind) || !rateLimit(anonSessionId)) {
            return false;
        }
        String source = normalizeStorefrontContextType(contextType);
        String key = normalizeContextKey(contextKey);
        if (source == null || key == null || !storefrontExists(source, key)) {
            return false;
        }
        return persistEvent(null, source, kind, anonSessionId, country, referrerHost, key, null, null, null);
    }

    /**
     * Per-listing analytics for a seller. Includes views and contact taps for
     * the last 7 and 30 days, plus a computed CTR.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getSellerAnalytics(UUID sellerUserId) {
        List<MarketplaceListing> listings =
                marketplaceListingRepository.findTop100BySellerUserIdOrderByCreatedAtDesc(sellerUserId);
        if (listings.isEmpty()) {
            return baseAnalyticsShape();
        }
        List<UUID> listingIds = listings.stream().map(MarketplaceListing::getId).toList();

        Instant now = Instant.now();
        Instant since7d = now.minus(7, ChronoUnit.DAYS);
        Instant since30d = now.minus(30, ChronoUnit.DAYS);

        Map<UUID, Map<String, KindAgg>> agg7d = aggByListing(
                listingEventRepository.aggregateByListingAndKindSince(listingIds, since7d));
        Map<UUID, Map<String, KindAgg>> agg30d = aggByListing(
                listingEventRepository.aggregateByListingAndKindSince(listingIds, since30d));

        List<Map<String, Object>> perListing = listings.stream()
                .map(l -> listingAnalyticsRow(l, agg7d, agg30d))
                .sorted(Comparator
                        .comparingLong((Map<String, Object> r) -> longValue(r.get("contactTaps30d")))
                        .reversed()
                        .thenComparingLong(r -> longValue(r.get("views30d")))
                        .reversed())
                .toList();

        Map<String, Object> boostRoi = computeBoostRoi(listings, agg30d);

        long views7d = sum(perListing, "views7d");
        long views30d = sum(perListing, "views30d");
        long contactTaps7d = sum(perListing, "contactTaps7d");
        long contactTaps30d = sum(perListing, "contactTaps30d");

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("perListing", perListing);
        Map<String, Object> totals = new LinkedHashMap<>();
        totals.put("views7d", views7d);
        totals.put("views30d", views30d);
        totals.put("contactTaps7d", contactTaps7d);
        totals.put("contactTaps30d", contactTaps30d);
        totals.put("contactTapRate7d", safeRate(contactTaps7d, views7d));
        totals.put("contactTapRate30d", safeRate(contactTaps30d, views30d));
        response.put("totals", totals);
        response.put("boostRoi", boostRoi);
        return response;
    }

    /**
     * Network-wide aggregates for the marketing panel. Includes total views,
     * contact taps, and the tap-to-contact rate for last 7d and 30d.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getNetworkTapToContactRate() {
        Instant now = Instant.now();
        Instant since7d = now.minus(7, ChronoUnit.DAYS);
        Instant since30d = now.minus(30, ChronoUnit.DAYS);

        Map<String, KindAgg> totals7d = totalsByKind(listingEventRepository.networkTotalsSince(since7d));
        Map<String, KindAgg> totals30d = totalsByKind(listingEventRepository.networkTotalsSince(since30d));

        long views7d = totals7d.getOrDefault("view", KindAgg.EMPTY).total;
        long taps7d = contactTapsFrom(totals7d);
        long views30d = totals30d.getOrDefault("view", KindAgg.EMPTY).total;
        long taps30d = contactTapsFrom(totals30d);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("views7d", views7d);
        response.put("views30d", views30d);
        response.put("contactTaps7d", taps7d);
        response.put("contactTaps30d", taps30d);
        response.put("contactTapRate7d", safeRate(taps7d, views7d));
        response.put("contactTapRate30d", safeRate(taps30d, views30d));
        return response;
    }

    /**
     * Network-wide partner listing aggregates (Monarch / official vendor mirrors).
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getPartnerListingEventTotals() {
        Instant since7d = Instant.now().minus(7, ChronoUnit.DAYS);
        Instant since30d = Instant.now().minus(30, ChronoUnit.DAYS);
        Map<String, KindAgg> totals7d = totalsByKind(listingEventRepository.partnerTotalsSince(since7d));
        Map<String, KindAgg> totals30d = totalsByKind(listingEventRepository.partnerTotalsSince(since30d));
        long views7d = totals7d.getOrDefault("view", KindAgg.EMPTY).total;
        long taps7d = totals7d.getOrDefault("contact_tap", KindAgg.EMPTY).total;
        long views30d = totals30d.getOrDefault("view", KindAgg.EMPTY).total;
        long taps30d = totals30d.getOrDefault("contact_tap", KindAgg.EMPTY).total;
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("views7d", views7d);
        out.put("views30d", views30d);
        out.put("contactTaps7d", taps7d);
        out.put("contactTaps30d", taps30d);
        out.put("contactTapRate7d", safeRate(taps7d, views7d));
        out.put("contactTapRate30d", safeRate(taps30d, views30d));
        out.put("shareOpens30d", totals30d.getOrDefault("share_open", KindAgg.EMPTY).total);
        out.put("shareDownloads30d", totals30d.getOrDefault("share_download", KindAgg.EMPTY).total);
        out.put("cardClicks30d", totals30d.getOrDefault("card_click", KindAgg.EMPTY).total);
        out.put("storefrontViews30d", listingEventRepository.countPartnerStorefrontViewsSince(since30d));
        return out;
    }

    // ─── helpers ──────────────────────────────────────────────────────────────

    private String resolveListingSource(UUID listingId) {
        if (marketplaceListingRepository.existsById(listingId)) {
            return SOURCE_PEER;
        }
        return partnerListingRepository.findById(listingId)
                .filter(p -> p.getStatus() == PartnerListingStatus.ACTIVE)
                .map(p -> SOURCE_PARTNER)
                .orElse(null);
    }

    private boolean rateLimit(String anonSessionId) {
        String session = (anonSessionId == null || anonSessionId.isBlank()) ? "anon" : anonSessionId.trim();
        return rateLimiter.allow("listing_events|" + session, ANON_MAX_EVENTS_PER_MIN, Duration.ofMinutes(1));
    }

    private boolean persistEvent(UUID listingId, String listingSource, String kind, String anonSessionId,
                                 String country, String referrerHost, String contextKey,
                                 String utmSource, String utmMedium, String utmCampaign) {
        String session = (anonSessionId == null || anonSessionId.isBlank()) ? "anon" : anonSessionId.trim();
        ListingEvent event = new ListingEvent();
        event.setListingId(listingId);
        event.setListingSource(listingSource);
        event.setKind(kind);
        event.setAnonSessionId(truncate(session, 64));
        event.setCountry(truncate(normalizeCountry(country), 8));
        event.setReferrerHost(truncate(referrerHost, 128));
        event.setContextKey(truncate(contextKey, 128));
        event.setUtmSource(truncate(normalizeUtm(utmSource), 64));
        event.setUtmMedium(truncate(normalizeUtm(utmMedium), 64));
        event.setUtmCampaign(truncate(normalizeUtm(utmCampaign), 96));
        securityHelper.tryGetCurrentUserId().ifPresent(event::setActorUserId);
        listingEventRepository.save(event);
        return true;
    }

    private static String normalizeStorefrontContextType(String raw) {
        if (raw == null) return null;
        String t = raw.trim().toLowerCase(Locale.ROOT);
        if (SOURCE_PEER.equals(t) || SOURCE_PARTNER.equals(t)) {
            return t;
        }
        return null;
    }

    private static String normalizeContextKey(String raw) {
        if (raw == null) return null;
        String k = raw.trim().toLowerCase(Locale.ROOT);
        return k.isEmpty() ? null : k;
    }

    private static String normalizeUtm(String raw) {
        if (raw == null) return null;
        String u = raw.trim().toLowerCase(Locale.ROOT);
        return u.isEmpty() ? null : u;
    }

    private boolean storefrontExists(String source, String contextKey) {
        if (SOURCE_PARTNER.equals(source)) {
            return officialVendorRepository.findBySlug(contextKey).isPresent();
        }
        return userRepository.findByPublicHandleIgnoreCase(contextKey).isPresent();
    }

    private record KindAgg(long total, long unique) {
        static final KindAgg EMPTY = new KindAgg(0, 0);
    }

    /** Sum of the whole contact_tap family (generic tap plus the per-channel variants). */
    private static long contactTapsFrom(Map<String, KindAgg> totals) {
        long sum = 0;
        for (Map.Entry<String, KindAgg> entry : totals.entrySet()) {
            if (entry.getKey() != null && entry.getKey().startsWith("contact_tap")) {
                sum += entry.getValue().total;
            }
        }
        return sum;
    }

    private static String normalizeKind(String raw) {
        if (raw == null) return null;
        String k = raw.trim().toLowerCase(Locale.ROOT).replace('-', '_');
        return ALLOWED_KINDS.contains(k) ? k : null;
    }

    private static String normalizeCountry(String raw) {
        if (raw == null) return null;
        String c = raw.trim().toUpperCase(Locale.ROOT);
        return c.isEmpty() ? null : c;
    }

    private static String truncate(String v, int max) {
        if (v == null) return null;
        if (v.length() <= max) return v;
        return v.substring(0, max);
    }

    private static Map<UUID, Map<String, KindAgg>> aggByListing(List<Object[]> rows) {
        Map<UUID, Map<String, KindAgg>> map = new HashMap<>();
        for (Object[] row : rows) {
            UUID listingId = (UUID) row[0];
            String kind = (String) row[1];
            long total = ((Number) row[2]).longValue();
            long unique = ((Number) row[3]).longValue();
            map.computeIfAbsent(listingId, k -> new HashMap<>()).put(kind, new KindAgg(total, unique));
        }
        return map;
    }

    private static Map<String, KindAgg> totalsByKind(List<Object[]> rows) {
        Map<String, KindAgg> map = new HashMap<>();
        for (Object[] row : rows) {
            String kind = (String) row[0];
            long total = ((Number) row[1]).longValue();
            long unique = ((Number) row[2]).longValue();
            map.put(kind, new KindAgg(total, unique));
        }
        return map;
    }

    private static long getTotal(Map<UUID, Map<String, KindAgg>> agg, UUID listingId, String kind) {
        Map<String, KindAgg> byKind = agg.get(listingId);
        if (byKind == null) return 0;
        KindAgg row = byKind.get(kind);
        return row == null ? 0 : row.total;
    }

    private static long getUnique(Map<UUID, Map<String, KindAgg>> agg, UUID listingId, String kind) {
        Map<String, KindAgg> byKind = agg.get(listingId);
        if (byKind == null) return 0;
        KindAgg row = byKind.get(kind);
        return row == null ? 0 : row.unique;
    }

    private static Map<String, Object> listingAnalyticsRow(MarketplaceListing l,
                                                            Map<UUID, Map<String, KindAgg>> agg7d,
                                                            Map<UUID, Map<String, KindAgg>> agg30d) {
        long views7d = getTotal(agg7d, l.getId(), "view");
        long views30d = getTotal(agg30d, l.getId(), "view");
        long uniqueViews7d = getUnique(agg7d, l.getId(), "view");
        long uniqueViews30d = getUnique(agg30d, l.getId(), "view");
        long taps7d = getTotal(agg7d, l.getId(), "contact_tap");
        long taps30d = getTotal(agg30d, l.getId(), "contact_tap");
        long shares7d = getTotal(agg7d, l.getId(), "share_open");
        long shares30d = getTotal(agg30d, l.getId(), "share_open");

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("listingId", l.getId());
        row.put("title", l.getTitle());
        row.put("status", l.getStatus());
        row.put("views7d", views7d);
        row.put("views30d", views30d);
        row.put("uniqueViews7d", uniqueViews7d);
        row.put("uniqueViews30d", uniqueViews30d);
        row.put("contactTaps7d", taps7d);
        row.put("contactTaps30d", taps30d);
        row.put("shares7d", shares7d);
        row.put("shares30d", shares30d);
        row.put("contactTapRate7d", safeRate(taps7d, views7d));
        row.put("contactTapRate30d", safeRate(taps30d, views30d));
        row.put("boosted", isListingBoostedNow(l));
        return row;
    }

    /** C3 — Compare average 30d views for boosted vs non-boosted listings. */
    private Map<String, Object> computeBoostRoi(List<MarketplaceListing> listings,
                                                 Map<UUID, Map<String, KindAgg>> agg30d) {
        long boostedViews = 0;
        long nonBoostedViews = 0;
        int boostedCount = 0;
        int nonBoostedCount = 0;
        for (MarketplaceListing l : listings) {
            long views = getTotal(agg30d, l.getId(), "view");
            if (isListingBoostedNow(l)) {
                boostedViews += views;
                boostedCount++;
            } else {
                nonBoostedViews += views;
                nonBoostedCount++;
            }
        }
        double avgBoosted = boostedCount > 0 ? (double) boostedViews / boostedCount : 0.0;
        double avgNonBoosted = nonBoostedCount > 0 ? (double) nonBoostedViews / nonBoostedCount : 0.0;
        Double upliftPct = null;
        if (boostedCount > 0 && nonBoostedCount > 0 && avgNonBoosted > 0) {
            upliftPct = Math.round(((avgBoosted - avgNonBoosted) / avgNonBoosted) * 1000.0) / 10.0;
        }
        Map<String, Object> roi = new LinkedHashMap<>();
        roi.put("boostedListingCount", boostedCount);
        roi.put("nonBoostedListingCount", nonBoostedCount);
        roi.put("avgViews30dBoosted", Math.round(avgBoosted * 10.0) / 10.0);
        roi.put("avgViews30dNonBoosted", Math.round(avgNonBoosted * 10.0) / 10.0);
        roi.put("viewsUpliftPct", upliftPct);
        return roi;
    }

    private static boolean isListingBoostedNow(MarketplaceListing l) {
        return l.getBoostedUntil() != null && l.getBoostedUntil().isAfter(Instant.now());
    }

    private static Map<String, Object> baseAnalyticsShape() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("perListing", List.of());
        Map<String, Object> totals = new LinkedHashMap<>();
        totals.put("views7d", 0L);
        totals.put("views30d", 0L);
        totals.put("contactTaps7d", 0L);
        totals.put("contactTaps30d", 0L);
        totals.put("contactTapRate7d", 0.0);
        totals.put("contactTapRate30d", 0.0);
        response.put("totals", totals);
        Map<String, Object> boostRoi = new LinkedHashMap<>();
        boostRoi.put("boostedListingCount", 0);
        boostRoi.put("nonBoostedListingCount", 0);
        boostRoi.put("avgViews30dBoosted", 0.0);
        boostRoi.put("avgViews30dNonBoosted", 0.0);
        boostRoi.put("viewsUpliftPct", null);
        response.put("boostRoi", boostRoi);
        return response;
    }

    private static long sum(List<Map<String, Object>> rows, String key) {
        return rows.stream().mapToLong(r -> longValue(r.get(key))).sum();
    }

    private static long longValue(Object v) {
        if (v instanceof Number n) return n.longValue();
        return 0L;
    }

    /** Returns rate rounded to 4 decimals (e.g. 0.1234 = 12.34%). */
    private static double safeRate(long numerator, long denominator) {
        if (denominator <= 0) return 0.0;
        double r = (double) numerator / (double) denominator;
        return Math.round(r * 10000.0) / 10000.0;
    }
}
