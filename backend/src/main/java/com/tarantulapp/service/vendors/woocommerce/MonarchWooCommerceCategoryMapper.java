package com.tarantulapp.service.vendors.woocommerce;

import com.fasterxml.jackson.databind.JsonNode;
import com.tarantulapp.marketplace.MarketplaceListingCategories;
import com.tarantulapp.service.vendors.PartnerListingTarantulaFilter;

import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * Maps Monarch WooCommerce into marketplace tabs. Tarantula specimens + husbandry supplies;
 * skips other live pets (jumping spiders, millipedes, scorpions, …).
 */
public final class MonarchWooCommerceCategoryMapper {

    private static final String BRAND_TARANTULA_CRIBS = "tarantula-cribs";

    /** WC categories for live animals we never import. */
    private static final Set<String> NON_TARANTULA_ANIMAL_SLUGS = Set.of(
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
    );

    private MonarchWooCommerceCategoryMapper() {
    }

    public static MappedProduct map(JsonNode product) {
        if (product == null || product.isNull()) {
            return null;
        }
        String title = text(product, "name");
        String description = stripHtml(text(product, "short_description"));
        if (PartnerListingTarantulaFilter.looksLikeNonTarantulaSpecimen(title, description)) {
            return null;
        }

        Set<String> slugs = collectCategorySlugs(product.get("categories"));
        if (hasNonTarantulaAnimalCategory(slugs)) {
            return null;
        }

        Set<String> brandSlugs = collectBrandSlugs(product.get("brands"));
        boolean promoted = brandSlugs.contains(BRAND_TARANTULA_CRIBS)
                || slugs.contains("tarantula-cribs")
                || containsSlugFragment(slugs, "tarantula-crib");

        String category = resolveCategory(slugs, brandSlugs);
        if (category == null) {
            return null;
        }
        return new MappedProduct(category, promoted, brandSlugs.isEmpty() ? null : brandSlugs.iterator().next());
    }

    private static boolean hasNonTarantulaAnimalCategory(Set<String> slugs) {
        for (String slug : slugs) {
            if (NON_TARANTULA_ANIMAL_SLUGS.contains(slug)) {
                return true;
            }
            if (slug.contains("millipede")
                    || slug.contains("jumping-spider")
                    || slug.contains("scorpion")
                    || (slug.contains("ants") && !slug.contains("plants"))) {
                return true;
            }
        }
        return false;
    }

    private static String resolveCategory(Set<String> slugs, Set<String> brandSlugs) {
        if (brandSlugs.contains(BRAND_TARANTULA_CRIBS) || containsSlugFragment(slugs, "tarantula-crib")) {
            return MarketplaceListingCategories.TERRARIUMS;
        }
        if (matchesAny(slugs, "tarantulas", "new-world", "old-world", "old-world-tarantulas")
                || containsSlugFragment(slugs, "tarantula")) {
            return MarketplaceListingCategories.TARANTULAS;
        }
        if (matchesAny(slugs, "feeder-insects", "feeder", "feeders", "frozen-feeders", "mice", "rats", "frozen-feeder")) {
            return MarketplaceListingCategories.LIVE_FOOD;
        }
        if (matchesAny(slugs, "substrate", "substrates")) {
            return MarketplaceListingCategories.SUBSTRATES;
        }
        if (matchesAny(slugs, "terrariums", "terrariums-and-enclosures", "enclosures", "starter-terrarium-kits",
                "pvc-cages", "exo-terra")) {
            return MarketplaceListingCategories.TERRARIUMS;
        }
        if (matchesAny(slugs, "supplies", "decorations", "feeding-and-watering", "temperature-heating-and-humidity",
                "bioactive-and-accessories", "cleaning", "foods", "jumping-spider-accessories",
                "animals-pet-supplies")) {
            return MarketplaceListingCategories.SUPPLIES;
        }
        if (matchesAny(slugs, "bioactive", "moss-plants-leaf-litter", "springtails-isopods-worms")) {
            return MarketplaceListingCategories.SUBSTRATES;
        }
        return null;
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

    private static boolean matchesAny(Set<String> slugs, String... candidates) {
        for (String c : candidates) {
            if (slugs.contains(c)) {
                return true;
            }
        }
        return false;
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
