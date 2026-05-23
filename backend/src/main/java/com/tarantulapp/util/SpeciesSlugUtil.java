package com.tarantulapp.util;

import java.text.Normalizer;
import java.util.Locale;

public final class SpeciesSlugUtil {

    private SpeciesSlugUtil() {}

    /** URL slug: lowercase, hyphens (handoff / sitemap convention). */
    public static String toHyphenSlug(String scientificName) {
        if (scientificName == null || scientificName.isBlank()) {
            return "";
        }
        String n = Normalizer.normalize(scientificName.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT);
        return n.replaceAll("[^a-z0-9]+", "-").replaceAll("^-+|-+$", "");
    }

    /** Catalog key slug: underscores (matches frontend `toSpeciesSlug`). */
    public static String toUnderscoreSlug(String scientificName) {
        if (scientificName == null || scientificName.isBlank()) {
            return "";
        }
        String n = Normalizer.normalize(scientificName.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT);
        return n.replaceAll("[^a-z0-9]+", "_").replaceAll("^_+|_+$", "");
    }

    public static boolean slugMatches(String scientificName, String slugOrId) {
        if (slugOrId == null || slugOrId.isBlank()) {
            return false;
        }
        String hyphen = toHyphenSlug(scientificName);
        String underscore = toUnderscoreSlug(scientificName);
        String needle = slugOrId.trim().toLowerCase(Locale.ROOT);
        return needle.equals(hyphen) || needle.equals(underscore);
    }
}
