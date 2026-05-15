package com.tarantulapp.marketplace;

import java.util.List;
import java.util.Set;

/**
 * Canonical marketplace product categories (peer + partner catalog).
 */
public final class MarketplaceListingCategories {

    public static final String TARANTULAS = "tarantulas";
    public static final String BREEDING_PROJECTS = "breeding_projects";
    public static final String LIVE_FOOD = "live_food";
    public static final String SUBSTRATES = "substrates";
    public static final String TERRARIUMS = "terrariums";
    public static final String SUPPLIES = "supplies";

    public static final String DEFAULT = TARANTULAS;

    private static final Set<String> ALL = Set.of(
            TARANTULAS,
            BREEDING_PROJECTS,
            LIVE_FOOD,
            SUBSTRATES,
            TERRARIUMS,
            SUPPLIES
    );

    private static final Set<String> COMMUNITY_PEER = Set.of(TARANTULAS, BREEDING_PROJECTS);

    private MarketplaceListingCategories() {
    }

    public static List<String> publicBrowseOrder() {
        return List.of(TARANTULAS, BREEDING_PROJECTS, LIVE_FOOD, SUBSTRATES, TERRARIUMS, SUPPLIES);
    }

    public static boolean isValid(String raw) {
        if (raw == null || raw.isBlank()) {
            return false;
        }
        return ALL.contains(normalize(raw));
    }

    public static String normalize(String raw) {
        if (raw == null) {
            return DEFAULT;
        }
        String v = raw.trim().toLowerCase().replace('-', '_').replace(' ', '_');
        if ("tarantula".equals(v) || "specimens".equals(v) || "spiders".equals(v)) {
            return TARANTULAS;
        }
        if ("breeding".equals(v) || "breeding_project".equals(v) || "project".equals(v)) {
            return BREEDING_PROJECTS;
        }
        if ("food".equals(v) || "livefood".equals(v)) {
            return LIVE_FOOD;
        }
        if ("substrate".equals(v)) {
            return SUBSTRATES;
        }
        if ("terrarium".equals(v) || "enclosure".equals(v)) {
            return TERRARIUMS;
        }
        if ("supply".equals(v) || "accessories".equals(v)) {
            return SUPPLIES;
        }
        return v;
    }

    public static String normalizeOrDefault(String raw) {
        String n = normalize(raw);
        return ALL.contains(n) ? n : DEFAULT;
    }

    public static boolean isCommunityPeerCategory(String category) {
        return COMMUNITY_PEER.contains(normalizeOrDefault(category));
    }

    public static boolean isSupplyCategory(String category) {
        String c = normalizeOrDefault(category);
        return LIVE_FOOD.equals(c) || SUBSTRATES.equals(c) || TERRARIUMS.equals(c) || SUPPLIES.equals(c);
    }
}
