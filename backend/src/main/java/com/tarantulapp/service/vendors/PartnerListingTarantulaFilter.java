package com.tarantulapp.service.vendors;

import com.tarantulapp.marketplace.MarketplaceListingCategories;

import java.util.Locale;

/**
 * Monarch partner feed is tarantula animals only — no millipedes, jumping spiders, feeders-as-pets, etc.
 */
public final class PartnerListingTarantulaFilter {

    public static final String MONARCH_VENDOR_SLUG = "monarch-reptiles";

    private PartnerListingTarantulaFilter() {
    }

    public static boolean isTarantulaAnimalListing(String title,
                                                   String description,
                                                   String listingCategory,
                                                   String vendorSlug) {
        if (vendorSlug == null || !MONARCH_VENDOR_SLUG.equalsIgnoreCase(vendorSlug.trim())) {
            return true;
        }
        String category = MarketplaceListingCategories.normalizeOrDefault(listingCategory);
        if (!MarketplaceListingCategories.TARANTULAS.equals(category)) {
            return false;
        }
        return !looksLikeNonTarantulaPet(title, description);
    }

    public static boolean looksLikeNonTarantulaPet(String title, String description) {
        String blob = ((title == null ? "" : title) + " " + (description == null ? "" : description))
                .toLowerCase(Locale.ROOT);
        if (blob.isBlank()) {
            return false;
        }
        return containsAny(blob,
                "millipede", "millipedes",
                "jumping spider", "jumping-spider", "jumping spiders",
                " scorpion", "scorpions", " scorpion ",
                " isopod", "isopods", "springtail",
                "centipede", "centipedes",
                "roach ", "roaches", "dubia", "mealworm", "superworm", "hornworm", "cricket",
                "feeder insect", "feeder insects",
                "mouse ", "mice ", "rat ", "rats ", "frozen feeder",
                "beetle", "beetles", "snail", "snails",
                "mantis", "mantid", "stick insect",
                "pacman frog", "dart frog", "tree frog",
                "gecko", "lizard", "snake", "python", "boa ",
                "chameleon", "tortoise", "turtle",
                "hermit crab", "tarantula hawk",
                "ant colony", " ant ", " ants ",
                "phidippus", "regal jumping", "bold jumping");
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
