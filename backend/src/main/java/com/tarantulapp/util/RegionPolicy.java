package com.tarantulapp.util;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Set;

/**
 * Single source of truth for country → region/currency mapping and the
 * country-gating rules that decide what each user can see and where they sell.
 *
 * <p>Localized regions ({@link #LOCALIZED_REGIONS}) get their own currency and a
 * country-scoped marketplace. Everyone else falls into {@code INT}: they can
 * browse, but listings and partners show a "coming soon to your country" hint.
 *
 * <p>The in-app TarantulApp checkout beta is gated to Canada only — see
 * {@link #isInAppCheckoutCountry(String)}.
 */
public final class RegionPolicy {

    /** Regions with a localized currency and a country-scoped marketplace. */
    public static final Set<String> LOCALIZED_REGIONS = Set.of("MX", "US", "CA");

    /** Region code used for everyone outside the localized set. */
    public static final String INTERNATIONAL = "INT";

    private RegionPolicy() {
    }

    /**
     * Maps a stored country name (e.g. {@code "Mexico"}, {@code "United States"},
     * {@code "Canada"}) or ISO code to a region code: {@code MX/US/CA/CO/INT}.
     */
    public static String regionForCountry(String country) {
        String norm = normalize(country);
        if (norm == null || norm.isBlank()) {
            return INTERNATIONAL;
        }
        return switch (norm) {
            case "mexico", "mx", "mex", "mexico " -> "MX";
            case "united states", "usa", "us", "united states of america", "estados unidos" -> "US";
            case "canada", "ca", "can" -> "CA";
            case "colombia", "co", "col" -> "CO";
            default -> INTERNATIONAL;
        };
    }

    /** True when the region runs a localized, country-scoped marketplace (MX/US/CA). */
    public static boolean isLocalizedRegion(String region) {
        return region != null && LOCALIZED_REGIONS.contains(region.trim().toUpperCase(Locale.ROOT));
    }

    /** Canonical stored country name for a region, or {@code null} for INT/unknown. */
    public static String canonicalCountryName(String region) {
        if (region == null) {
            return null;
        }
        return switch (region.trim().toUpperCase(Locale.ROOT)) {
            case "MX" -> "Mexico";
            case "US" -> "United States";
            case "CA" -> "Canada";
            case "CO" -> "Colombia";
            default -> null;
        };
    }

    /** ISO-4217 currency a seller in this country must price in. Defaults to USD. */
    public static String currencyForCountry(String country) {
        return switch (regionForCountry(country)) {
            case "MX" -> "MXN";
            case "CA" -> "CAD";
            case "CO" -> "COP";
            default -> "USD"; // US + INT price in USD
        };
    }

    /**
     * Beta gate: in-app TarantulApp checkout is only available to partners based
     * in Canada. US and México keep website/storefront/handoff only.
     */
    public static boolean isInAppCheckoutCountry(String country) {
        return "CA".equals(regionForCountry(country));
    }

    private static String normalize(String raw) {
        if (raw == null) {
            return null;
        }
        String stripped = Normalizer.normalize(raw.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        return stripped.toLowerCase(Locale.ROOT);
    }
}
