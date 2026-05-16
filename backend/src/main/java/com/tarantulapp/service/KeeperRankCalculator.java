package com.tarantulapp.service;

import com.tarantulapp.repository.BehaviorLogRepository;
import com.tarantulapp.repository.FeedingLogRepository;
import com.tarantulapp.repository.MoltLogRepository;
import com.tarantulapp.repository.TarantulaRepository;
import com.tarantulapp.repository.UserRepository;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Keeper “reputation” as staged ranks (beginner → intermediate → expert → breeder),
 * each with 0–100% completion before advancing. Replaces the old additive score that
 * could hit top tier with modest collection sizes.
 */
@Component
public class KeeperRankCalculator {

    public static final String RANK_BEGINNER = "beginner";
    public static final String RANK_INTERMEDIATE = "intermediate";
    public static final String RANK_EXPERT = "expert";
    public static final String RANK_BREEDER = "breeder";
    public static final String NEXT_MAX = "Max";

    private static final double EPS = 0.0005;

    /** Axis weights: collection size, species diversity, log activity, QR usage. */
    private static final double[] WEIGHTS = {0.32, 0.34, 0.26, 0.08};

    private final TarantulaRepository tarantulaRepository;
    private final FeedingLogRepository feedingLogRepository;
    private final MoltLogRepository moltLogRepository;
    private final BehaviorLogRepository behaviorLogRepository;
    private final UserRepository userRepository;

    public KeeperRankCalculator(
            TarantulaRepository tarantulaRepository,
            FeedingLogRepository feedingLogRepository,
            MoltLogRepository moltLogRepository,
            BehaviorLogRepository behaviorLogRepository,
            UserRepository userRepository) {
        this.tarantulaRepository = tarantulaRepository;
        this.feedingLogRepository = feedingLogRepository;
        this.moltLogRepository = moltLogRepository;
        this.behaviorLogRepository = behaviorLogRepository;
        this.userRepository = userRepository;
    }

    public KeeperRankSnapshot compute(UUID userId) {
        return computeDetail(userId).snapshot();
    }

    /**
     * Same rank logic as {@link #compute(UUID)} plus per-axis milestones for the <em>current</em> stage
     * (collection size, species count, log events, QR prints). Used to explain what still moves the bar.
     */
    public KeeperRankDetail computeDetail(UUID userId) {
        long total = tarantulaRepository.countByUserId(userId);
        long species = tarantulaRepository.countDistinctSpeciesByUserId(userId);
        long events = feedingLogRepository.countByOwnerUserId(userId)
                + moltLogRepository.countByOwnerUserId(userId)
                + behaviorLogRepository.countByOwnerUserId(userId);
        int qrPrints = userRepository.findById(userId)
                .map(u -> u.getQrPrintExports() == null ? 0 : u.getQrPrintExports()).orElse(0);
        KeeperRankSnapshot snap = computeFromStats(total, species, events, qrPrints);
        List<Map<String, Object>> axes = buildReputationAxes(snap.rankKey(), total, species, events, qrPrints);
        return new KeeperRankDetail(snap, axes);
    }

    /**
     * Linear 0–100 score for weighting (e.g. Sex ID votes): finishing beginner ≈ 25, …, breeder max = 100.
     */
    public int linearInfluenceScore(UUID userId) {
        KeeperRankSnapshot s = compute(userId);
        int idx = rankIndex(s.rankKey());
        return Math.min(100, idx * 25 + (int) Math.round(s.progressPercent() * 0.25d));
    }

    KeeperRankSnapshot computeFromStats(long total, long species, long events, int qrPrints) {
        double pBeginner = weightedProgress(
                total, species, events, qrPrints,
                0, 16, 0, 4, 0, 45, 0, 1);
        if (pBeginner + EPS < 1.0) {
            return finishSnapshot(RANK_BEGINNER, pBeginner, RANK_INTERMEDIATE);
        }
        double pIntermediate = weightedProgress(
                total, species, events, qrPrints,
                16, 40, 4, 10, 45, 150, 1, 5);
        if (pIntermediate + EPS < 1.0) {
            return finishSnapshot(RANK_INTERMEDIATE, pIntermediate, RANK_EXPERT);
        }
        double pExpert = weightedProgress(
                total, species, events, qrPrints,
                40, 72, 10, 18, 150, 420, 5, 14);
        if (pExpert + EPS < 1.0) {
            return finishSnapshot(RANK_EXPERT, pExpert, RANK_BREEDER);
        }
        double pBreeder = weightedProgress(
                total, species, events, qrPrints,
                72, 120, 18, 30, 420, 900, 14, 40);
        double rawBreed = Math.min(1.0, pBreeder);
        int pctB = (int) Math.round(Math.max(0.0, rawBreed) * 100.0);
        pctB = Math.min(100, pctB);
        int remB = Math.max(0, 100 - pctB);
        boolean breederComplete = rawBreed + EPS >= 1.0 || pctB >= 100;
        String nextBreeder = breederComplete ? NEXT_MAX : "none";
        return new KeeperRankSnapshot(RANK_BREEDER, pctB, nextBreeder, remB);
    }

    private KeeperRankSnapshot finishSnapshot(String rank, double progress01, String nextTier) {
        int pct = (int) Math.round(Math.min(1.0, Math.max(0.0, progress01)) * 100.0);
        pct = Math.min(100, pct);
        int remaining = Math.max(0, 100 - pct);
        return new KeeperRankSnapshot(rank, pct, nextTier, remaining);
    }

    private static int rankIndex(String rankKey) {
        return switch (rankKey) {
            case RANK_BEGINNER -> 0;
            case RANK_INTERMEDIATE -> 1;
            case RANK_EXPERT -> 2;
            case RANK_BREEDER -> 3;
            default -> 0;
        };
    }

    /**
     * Progress 0–1 along each axis between floor (exclusive progress start) and ceiling (100% of axis),
     * then weighted sum. For the first rank, floors are zero.
     */
    private static double weightedProgress(
            long total, long species, long events, int qr,
            int spiderLo, int spiderHi,
            int speciesLo, int speciesHi,
            int eventsLo, int eventsHi,
            int qrLo, int qrHi) {
        double pSpider = segmentProgress(total, spiderLo, spiderHi);
        double pSpecies = segmentProgress(species, speciesLo, speciesHi);
        double pEvents = segmentProgress(events, eventsLo, eventsHi);
        double pQr = segmentProgress(qr, qrLo, qrHi);
        return WEIGHTS[0] * pSpider
                + WEIGHTS[1] * pSpecies
                + WEIGHTS[2] * pEvents
                + WEIGHTS[3] * pQr;
    }

    private static double segmentProgress(long value, long low, long high) {
        if (high <= low) {
            return value >= high ? 1.0 : 0.0;
        }
        if (value <= low) {
            return 0.0;
        }
        if (value >= high) {
            return 1.0;
        }
        return (value - low) / (double) (high - low);
    }

    private static int[] axisBoundsForRank(String rankKey) {
        return switch (rankKey) {
            case RANK_BEGINNER -> new int[]{0, 16, 0, 4, 0, 45, 0, 1};
            case RANK_INTERMEDIATE -> new int[]{16, 40, 4, 10, 45, 150, 1, 5};
            case RANK_EXPERT -> new int[]{40, 72, 10, 18, 150, 420, 5, 14};
            case RANK_BREEDER -> new int[]{72, 120, 18, 30, 420, 900, 14, 40};
            default -> new int[]{0, 16, 0, 4, 0, 45, 0, 1};
        };
    }

    /**
     * Milestone window for the current rank (same numbers that feed the weighted progress for that stage).
     */
    public List<Map<String, Object>> buildReputationAxes(
            String rankKey, long total, long species, long events, int qrPrints) {
        int[] b = axisBoundsForRank(rankKey);
        long[] vals = {total, species, events, qrPrints};
        String[] keys = {"spiders", "species", "events", "qr_labels"};
        List<Map<String, Object>> out = new ArrayList<>(4);
        for (int i = 0; i < 4; i++) {
            int lo = b[i * 2];
            int hi = b[i * 2 + 1];
            long v = vals[i];
            double seg = segmentProgress(v, lo, hi);
            int pct = (int) Math.round(Math.min(1.0, Math.max(0.0, seg)) * 100.0);
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("key", keys[i]);
            m.put("current", v);
            m.put("rangeLow", lo);
            m.put("rangeHigh", hi);
            m.put("segmentPercent", pct);
            out.add(m);
        }
        return out;
    }

    /** Axis key with the lowest completion within this stage, excluding axes already at 100%. */
    public static String weakestAxisKey(List<Map<String, Object>> axes) {
        String weakest = null;
        int minPct = 101;
        for (Map<String, Object> ax : axes) {
            int seg = ((Number) ax.get("segmentPercent")).intValue();
            if (seg >= 100) {
                continue;
            }
            if (seg < minPct) {
                minPct = seg;
                weakest = (String) ax.get("key");
            }
        }
        return weakest;
    }

    public record KeeperRankSnapshot(
            String rankKey,
            int progressPercent,
            String nextTierKey,
            int remainingPercent) {}

    public record KeeperRankDetail(KeeperRankSnapshot snapshot, List<Map<String, Object>> axes) {}
}
