package com.tarantulapp.service.vendors.woocommerce;

import com.fasterxml.jackson.databind.JsonNode;
import com.tarantulapp.marketplace.MarketplaceListingCategories;
import com.tarantulapp.service.vendors.PartnerListingTarantulaFilter;

import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * Monarch sync: tarantula animals only (explicit WC tarantula categories).
 */
public final class MonarchWooCommerceCategoryMapper {

    private static final String BRAND_TARANTULA_CRIBS = "tarantula-cribs";

    private static final Set<String> TARANTULA_CATEGORY_SLUGS = Set.of(
            "tarantulas",
            "new-world",
            "old-world",
            "old-world-tarantulas"
    );

    private static final Set<String> NON_TARANTULA_CATEGORY_SLUGS = Set.of(
            "jumping-spiders",
            "jumping-spider",
            "millipedes",
            "millipede",
            "scorpions",
            "scorpion",
            "ants",
            "ant",
            "other-invertebrates",
            "invertebrates",
            "isopods",
            "roaches",
            "centipedes",
            "snails",
            "beetles",
            "feeder-insects",
            "feeder",
            "feeders",
            "mice",
            "rats"
    );

    private MonarchWooCommerceCategoryMapper() {
    }

    public static MappedProduct map(JsonNode product) {
        if (product == null || product.isNull()) {
            return null;
        }
        if (PartnerListingTarantulaFilter.looksLikeNonTarantulaPet(text(product, "name"), stripHtml(text(product, "short_description")))) {
            return null;
        }
        Set<String> slugs = collectCategorySlugs(product.get("categories"));
        if (hasBlockedCategory(slugs)) {
            return null;
        }
        if (!hasTarantulaCategory(slugs)) {
            return null;
        }
        Set<String> brandSlugs = collectBrandSlugs(product.get("brands"));
        boolean promoted = brandSlugs.contains(BRAND_TARANTULA_CRIBS)
                || slugs.contains("tarantula-cribs")
                || containsSlugFragment(slugs, "tarantula-crib");

        return new MappedProduct(MarketplaceListingCategories.TARANTULAS, promoted,
                brandSlugs.isEmpty() ? null : brandSlugs.iterator().next());
    }

    private static boolean hasTarantulaCategory(Set<String> slugs) {
        for (String slug : TARANTULA_CATEGORY_SLUGS) {
            if (slugs.contains(slug)) {
                return true;
            }
        }
        return containsSlugFragment(slugs, "tarantula");
    }

    private static boolean hasBlockedCategory(Set<String> slugs) {
        for (String slug : slugs) {
            if (NON_TARANTULA_CATEGORY_SLUGS.contains(slug) || containsBlockedFragment(slug)) {
                return true;
            }
        }
        return false;
    }

    private static boolean containsBlockedFragment(String slug) {
        return slug.contains("millipede")
                || slug.contains("jumping-spider")
                || slug.contains("scorpion")
                || slug.contains("feeder")
                || slug.contains("isopod")
                || slug.contains("centipede");
    }

    private static Set<String> collectCategorySlugs(JsonNode categories) {
        Set<String> out = new HashSet<>();
        if (categories == null || !categories.isArray()) {
            return out;
        }
        for (JsonNode c : categories) {
            String slug = text(c, "slug");
            if (slug != null) {
                out.add(slug.toLowerCase(Locale.ROOT));
            }
        }
        return out;
    }

    private static Set<String> collectBrandSlugs(JsonNode brands) {
        Set<String> out = new HashSet<>();
        if (brands == null || !brands.isArray()) {
            return out;
        }
        for (JsonNode b : brands) {
            String slug = text(b, "slug");
            if (slug != null) {
                out.add(slug.toLowerCase(Locale.ROOT));
            }
        }
        return out;
    }

    private static boolean containsSlugFragment(Set<String> slugs, String fragment) {
        for (String s : slugs) {
            if (s.contains(fragment)) {
                return true;
            }
        }
        return false;
    }

    private static String stripHtml(String raw) {
        if (raw == null) {
            return null;
        }
        return raw.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node.get(field);
        if (v == null || v.isNull()) return null;
        String s = v.asText().trim();
        return s.isEmpty() ? null : s;
    }

    public record MappedProduct(String listingCategory, boolean promoted, String brandSlug) {
    }
}
