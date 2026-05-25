package com.tarantulapp.service.vendors;

import com.tarantulapp.marketplace.MarketplaceListingCategories;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Shared partner catalog gates. Official partners can override categories and blocked terms through feedConfig.
 */
public final class PartnerListingCatalogRules {

    private static final Set<String> DEFAULT_ALLOWED_CATEGORIES = Set.of(
            MarketplaceListingCategories.TARANTULAS,
            MarketplaceListingCategories.TERRARIUMS,
            MarketplaceListingCategories.SUBSTRATES,
            MarketplaceListingCategories.LIVE_FOOD,
            MarketplaceListingCategories.SUPPLIES,
            MarketplaceListingCategories.BREEDING_PROJECTS
    );

    private static final Set<String> DEFAULT_BLOCKED_TITLE_TERMS = Set.of(
            "millipede", "millipedes",
            "jumping spider", "jumping-spider", "jumping spiders",
            " scorpion", "scorpions", " scorpion ",
            "centipede", "centipedes",
            "mantis", "mantid", "stick insect",
            "pacman frog", "dart frog", "tree frog",
            "gecko", "lizard", "snake", "python", "boa ",
            "chameleon", "tortoise", "turtle",
            "hermit crab",
            "ant colony", " ant ", " ants ",
            "phidippus", "regal jumping", "bold jumping",
            "narceus americanus"
    );

    private PartnerListingCatalogRules() {
    }

    public static boolean isAllowedListing(String title,
                                           String description,
                                           String listingCategory,
                                           Map<String, Object> feedConfig) {
        if (looksLikeBlockedSpecimen(title, description, feedConfig)) {
            return false;
        }
        return isAllowedCategory(listingCategory, feedConfig);
    }

    public static boolean isAllowedCategory(String listingCategory, Map<String, Object> feedConfig) {
        String category = MarketplaceListingCategories.normalizeOrDefault(listingCategory);
        Set<String> allowed = configuredCategorySet(feedConfig, "allowedCategories", DEFAULT_ALLOWED_CATEGORIES);
        return allowed.contains(category);
    }

    public static boolean looksLikeBlockedSpecimen(String title, String description, Map<String, Object> feedConfig) {
        String blob = ((title == null ? "" : title) + " " + (description == null ? "" : description))
                .toLowerCase(Locale.ROOT);
        if (blob.isBlank()) {
            return false;
        }
        for (String term : blockedTitleTerms(feedConfig)) {
            if (blob.contains(term)) {
                return true;
            }
        }
        return false;
    }

    public static Set<String> blockedCategorySlugs(Map<String, Object> feedConfig) {
        Set<String> out = new LinkedHashSet<>(Set.of(
                "jumping-spiders",
                "jumping-spider",
                "millipedes",
                "millipede",
                "scorpions",
                "scorpion",
                "ants",
                "ant",
                "other-invertebrates",
                "centipedes",
                "snails",
                "beetles"
        ));
        out.addAll(configuredSlugSet(feedConfig, "blockedCategorySlugs"));
        out.addAll(configuredSlugSet(feedConfig, "blockedCategories"));
        return out;
    }

    private static Set<String> blockedTitleTerms(Map<String, Object> feedConfig) {
        Set<String> out = new LinkedHashSet<>(DEFAULT_BLOCKED_TITLE_TERMS);
        Object raw = feedConfig == null ? null : feedConfig.get("blockedTitleTerms");
        if (raw instanceof Collection<?> values) {
            for (Object value : values) {
                String term = normalizeLoose(value);
                if (term != null) {
                    out.add(term);
                }
            }
        }
        return out;
    }

    private static Set<String> configuredCategorySet(Map<String, Object> feedConfig,
                                                     String key,
                                                     Set<String> fallback) {
        Object raw = feedConfig == null ? null : feedConfig.get(key);
        if (!(raw instanceof Collection<?> values) || values.isEmpty()) {
            return fallback;
        }
        Set<String> out = new LinkedHashSet<>();
        for (Object value : values) {
            String normalized = normalizeLoose(value);
            if (normalized != null && MarketplaceListingCategories.isValid(normalized)) {
                out.add(MarketplaceListingCategories.normalizeOrDefault(normalized));
            }
        }
        return out.isEmpty() ? fallback : out;
    }

    private static Set<String> configuredSlugSet(Map<String, Object> feedConfig, String key) {
        Object raw = feedConfig == null ? null : feedConfig.get(key);
        if (!(raw instanceof Collection<?> values)) {
            return Set.of();
        }
        Set<String> out = new LinkedHashSet<>();
        for (Object value : values) {
            String normalized = normalizeLoose(value);
            if (normalized != null) {
                out.add(normalized);
            }
        }
        return out;
    }

    private static String normalizeLoose(Object value) {
        if (value == null) {
            return null;
        }
        String raw = value.toString().trim().toLowerCase(Locale.ROOT);
        return raw.isEmpty() ? null : raw;
    }
}
