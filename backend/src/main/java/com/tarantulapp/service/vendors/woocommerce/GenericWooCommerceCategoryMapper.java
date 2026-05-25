package com.tarantulapp.service.vendors.woocommerce;

import com.fasterxml.jackson.databind.JsonNode;
import com.tarantulapp.marketplace.MarketplaceListingCategories;
import com.tarantulapp.service.vendors.PartnerListingCatalogRules;

import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Config-driven WooCommerce category mapper for approved official/founding partners.
 */
public final class GenericWooCommerceCategoryMapper {

    private static final String BRAND_TARANTULA_CRIBS = "tarantula-cribs";

    private static final Map<String, String> DEFAULT_CATEGORY_MAPPING = Map.ofEntries(
            Map.entry("tarantulas", MarketplaceListingCategories.TARANTULAS),
            Map.entry("new-world", MarketplaceListingCategories.TARANTULAS),
            Map.entry("old-world", MarketplaceListingCategories.TARANTULAS),
            Map.entry("old-world-tarantulas", MarketplaceListingCategories.TARANTULAS),
            Map.entry("tarantula-cribs", MarketplaceListingCategories.TERRARIUMS),
            Map.entry("terrariums", MarketplaceListingCategories.TERRARIUMS),
            Map.entry("terrariums-and-enclosures", MarketplaceListingCategories.TERRARIUMS),
            Map.entry("enclosures", MarketplaceListingCategories.TERRARIUMS),
            Map.entry("starter-terrarium-kits", MarketplaceListingCategories.TERRARIUMS),
            Map.entry("pvc-cages", MarketplaceListingCategories.TERRARIUMS),
            Map.entry("exo-terra", MarketplaceListingCategories.TERRARIUMS),
            Map.entry("substrate", MarketplaceListingCategories.SUBSTRATES),
            Map.entry("substrates", MarketplaceListingCategories.SUBSTRATES),
            Map.entry("bioactive", MarketplaceListingCategories.SUBSTRATES),
            Map.entry("moss-plants-leaf-litter", MarketplaceListingCategories.SUBSTRATES),
            Map.entry("springtails-isopods-worms", MarketplaceListingCategories.SUBSTRATES),
            Map.entry("feeder-insects", MarketplaceListingCategories.LIVE_FOOD),
            Map.entry("feeder", MarketplaceListingCategories.LIVE_FOOD),
            Map.entry("feeders", MarketplaceListingCategories.LIVE_FOOD),
            Map.entry("frozen-feeders", MarketplaceListingCategories.LIVE_FOOD),
            Map.entry("frozen-feeder", MarketplaceListingCategories.LIVE_FOOD),
            Map.entry("mice", MarketplaceListingCategories.LIVE_FOOD),
            Map.entry("rats", MarketplaceListingCategories.LIVE_FOOD),
            Map.entry("supplies", MarketplaceListingCategories.SUPPLIES),
            Map.entry("decorations", MarketplaceListingCategories.SUPPLIES),
            Map.entry("feeding-and-watering", MarketplaceListingCategories.SUPPLIES),
            Map.entry("temperature-heating-and-humidity", MarketplaceListingCategories.SUPPLIES),
            Map.entry("bioactive-and-accessories", MarketplaceListingCategories.SUPPLIES),
            Map.entry("cleaning", MarketplaceListingCategories.SUPPLIES),
            Map.entry("foods", MarketplaceListingCategories.SUPPLIES),
            Map.entry("jumping-spider-accessories", MarketplaceListingCategories.SUPPLIES),
            Map.entry("animals-pet-supplies", MarketplaceListingCategories.SUPPLIES)
    );

    private GenericWooCommerceCategoryMapper() {
    }

    public static MappedProduct map(JsonNode product, Map<String, Object> feedConfig) {
        if (product == null || product.isNull()) {
            return null;
        }
        String title = text(product, "name");
        String description = stripHtml(text(product, "short_description"));
        if (PartnerListingCatalogRules.looksLikeBlockedSpecimen(title, description, feedConfig)) {
            return null;
        }

        Set<String> slugs = collectSlugs(product.get("categories"));
        if (hasBlockedCategory(slugs, feedConfig)) {
            return null;
        }

        Set<String> brandSlugs = collectSlugs(product.get("brands"));
        String category = resolveCategory(slugs, brandSlugs, feedConfig);
        if (category == null || !PartnerListingCatalogRules.isAllowedCategory(category, feedConfig)) {
            return null;
        }

        boolean promoted = isPromoted(slugs, brandSlugs, feedConfig);
        return new MappedProduct(category, promoted, brandSlugs.isEmpty() ? null : brandSlugs.iterator().next());
    }

    private static boolean hasBlockedCategory(Set<String> slugs, Map<String, Object> feedConfig) {
        Set<String> blocked = PartnerListingCatalogRules.blockedCategorySlugs(feedConfig);
        for (String slug : slugs) {
            if (blocked.contains(slug)) {
                return true;
            }
            for (String blockedSlug : blocked) {
                if (blockedSlug.length() > 4 && slug.contains(blockedSlug)) {
                    return true;
                }
            }
        }
        return false;
    }

    private static String resolveCategory(Set<String> slugs, Set<String> brandSlugs, Map<String, Object> feedConfig) {
        Map<String, String> mapping = categoryMapping(feedConfig);
        for (String brandSlug : brandSlugs) {
            String mapped = mapping.get(brandSlug);
            if (mapped != null) {
                return mapped;
            }
        }
        for (String slug : slugs) {
            String mapped = mapping.get(slug);
            if (mapped != null) {
                return mapped;
            }
        }
        for (String slug : slugs) {
            for (Map.Entry<String, String> entry : mapping.entrySet()) {
                if (slug.contains(entry.getKey())) {
                    return entry.getValue();
                }
            }
        }
        return null;
    }

    private static Map<String, String> categoryMapping(Map<String, Object> feedConfig) {
        Map<String, String> out = new HashMap<>(DEFAULT_CATEGORY_MAPPING);
        Object raw = feedConfig == null ? null : feedConfig.get("categoryMapping");
        if (raw instanceof Map<?, ?> configured) {
            for (Map.Entry<?, ?> entry : configured.entrySet()) {
                String key = normalizeSlug(entry.getKey());
                String category = entry.getValue() == null ? null : entry.getValue().toString();
                if (key != null && MarketplaceListingCategories.isValid(category)) {
                    out.put(key, MarketplaceListingCategories.normalizeOrDefault(category));
                }
            }
        }
        return out;
    }

    private static boolean isPromoted(Set<String> slugs, Set<String> brandSlugs, Map<String, Object> feedConfig) {
        Set<String> promotedBrandSlugs = configuredSlugSet(feedConfig, "promotedBrandSlugs");
        Set<String> promotedCategorySlugs = configuredSlugSet(feedConfig, "promotedCategorySlugs");
        if (promotedBrandSlugs.isEmpty() && promotedCategorySlugs.isEmpty()) {
            promotedBrandSlugs = Set.of(BRAND_TARANTULA_CRIBS);
            promotedCategorySlugs = Set.of(BRAND_TARANTULA_CRIBS);
        }
        for (String brandSlug : brandSlugs) {
            if (promotedBrandSlugs.contains(brandSlug)) {
                return true;
            }
        }
        for (String slug : slugs) {
            if (promotedCategorySlugs.contains(slug) || slug.contains(BRAND_TARANTULA_CRIBS)) {
                return true;
            }
        }
        return Boolean.TRUE.equals(feedConfig == null ? null : feedConfig.get("promoteAllProducts"));
    }

    private static Set<String> configuredSlugSet(Map<String, Object> feedConfig, String key) {
        Object raw = feedConfig == null ? null : feedConfig.get(key);
        if (!(raw instanceof Collection<?> values)) {
            return Set.of();
        }
        Set<String> out = new HashSet<>();
        for (Object value : values) {
            String slug = normalizeSlug(value);
            if (slug != null) {
                out.add(slug);
            }
        }
        return out;
    }

    private static Set<String> collectSlugs(JsonNode nodes) {
        Set<String> out = new HashSet<>();
        if (nodes == null || !nodes.isArray()) {
            return out;
        }
        for (JsonNode node : nodes) {
            String slug = normalizeSlug(text(node, "slug"));
            if (slug != null) {
                out.add(slug);
            }
        }
        return out;
    }

    private static String normalizeSlug(Object value) {
        if (value == null) {
            return null;
        }
        String slug = value.toString().trim().toLowerCase(Locale.ROOT);
        return slug.isEmpty() ? null : slug;
    }

    private static String stripHtml(String raw) {
        if (raw == null) {
            return null;
        }
        return raw.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
    }

    private static String text(JsonNode node, String field) {
        if (node == null) {
            return null;
        }
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) {
            return null;
        }
        String text = value.asText().trim();
        return text.isEmpty() ? null : text;
    }

    public record MappedProduct(String listingCategory, boolean promoted, String brandSlug) {
    }
}
