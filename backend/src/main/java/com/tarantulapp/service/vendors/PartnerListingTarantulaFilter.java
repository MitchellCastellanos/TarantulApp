package com.tarantulapp.service.vendors;

import com.tarantulapp.marketplace.MarketplaceListingCategories;

import java.util.Locale;
import java.util.Set;

/**
 * Monarch catalog: tarantula specimens + tarantula-keeping supplies (terrariums, feeders, substrate, etc.).
 * Excludes other live pets (jumping spiders, millipedes, scorpions, …).
 */
public final class PartnerListingTarantulaFilter {

    public static final String MONARCH_VENDOR_SLUG = "monarch-reptiles";

    private static final Set<String> SUPPLY_CATEGORIES = Set.of(
            MarketplaceListingCategories.TERRARIUMS,
            MarketplaceListingCategories.SUBSTRATES,
            MarketplaceListingCategories.LIVE_FOOD,
            MarketplaceListingCategories.SUPPLIES,
            MarketplaceListingCategories.BREEDING_PROJECTS
    );

    private PartnerListingTarantulaFilter() {
    }

    public static boolean isAllowedMonarchListing(String title,
                                                 String description,
                                                 String listingCategory,
                                                 String vendorSlug) {
        if (vendorSlug == null || !MONARCH_VENDOR_SLUG.equalsIgnoreCase(vendorSlug.trim())) {
            return true;
        }
        if (looksLikeNonTarantulaSpecimen(title, description)) {
            return false;
        }
        String category = MarketplaceListingCategories.normalizeOrDefault(listingCategory);
        if (SUPPLY_CATEGORIES.contains(category)) {
            return true;
        }
        if (MarketplaceListingCategories.TARANTULAS.equals(category)) {
            return true;
        }
        return false;
    }

    /** Live animals / specimens that are not tarantulas (supplies and feeders are OK). */
    public static boolean looksLikeNonTarantulaSpecimen(String title, String description) {
        String blob = ((title == null ? "" : title) + " " + (description == null ? "" : description))
                .toLowerCase(Locale.ROOT);
        if (blob.isBlank()) {
            return false;
        }
        return containsAny(blob,
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
                "narceus americanus");
    }

    private static boolean containsAny(String haystack, String... needles) {
        for (String needle : needles) {
            if (haystack.contains(needle)) {
                return true;
            }
        }
        return false;
    }
}
