package com.tarantulapp.service.vendors.woocommerce;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tarantulapp.marketplace.MarketplaceListingCategories;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GenericWooCommerceCategoryMapperTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void mapsDefaultWooCommerceCategories() throws Exception {
        var tarantula = mapper.readTree("""
                {"name": "Brachypelma hamorii", "categories": [{"slug": "tarantulas"}, {"slug": "new-world"}]}
                """);
        assertEquals(MarketplaceListingCategories.TARANTULAS,
                GenericWooCommerceCategoryMapper.map(tarantula, Map.of()).listingCategory());

        var terrarium = mapper.readTree("""
                {"name": "Exo Terra enclosure", "categories": [{"slug": "terrariums"}]}
                """);
        assertEquals(MarketplaceListingCategories.TERRARIUMS,
                GenericWooCommerceCategoryMapper.map(terrarium, Map.of()).listingCategory());

        var feeders = mapper.readTree("""
                {"name": "Dubia roaches", "categories": [{"slug": "feeder-insects"}]}
                """);
        assertEquals(MarketplaceListingCategories.LIVE_FOOD,
                GenericWooCommerceCategoryMapper.map(feeders, Map.of()).listingCategory());
    }

    @Test
    void usesConfiguredCategoryMappingAndAllowedCategories() throws Exception {
        var product = mapper.readTree("""
                {"name": "Cork bark flat", "categories": [{"slug": "cork-bark"}]}
                """);
        Map<String, Object> config = Map.of(
                "allowedCategories", java.util.List.of("supplies"),
                "categoryMapping", Map.of("cork-bark", "supplies")
        );

        assertEquals(MarketplaceListingCategories.SUPPLIES,
                GenericWooCommerceCategoryMapper.map(product, config).listingCategory());

        Map<String, Object> tarantulasOnly = Map.of(
                "allowedCategories", java.util.List.of("tarantulas"),
                "categoryMapping", Map.of("cork-bark", "supplies")
        );
        assertNull(GenericWooCommerceCategoryMapper.map(product, tarantulasOnly));
    }

    @Test
    void skipsBlockedProductsAndPromotesConfiguredBrands() throws Exception {
        assertNull(GenericWooCommerceCategoryMapper.map(mapper.readTree("""
                {"name": "Phidippus audax", "categories": [{"slug": "jumping-spiders"}]}
                """), Map.of()));
        assertNull(GenericWooCommerceCategoryMapper.map(mapper.readTree("""
                {"name": "Narceus Americanus Millipede", "categories": [{"slug": "invertebrates"}]}
                """), Map.of()));

        var promoted = mapper.readTree("""
                {"name": "Acrylic enclosure", "categories": [{"slug": "custom-cages"}], "brands": [{"slug": "premium-builder"}]}
                """);
        Map<String, Object> config = Map.of(
                "categoryMapping", Map.of("custom-cages", "terrariums"),
                "promotedBrandSlugs", java.util.List.of("premium-builder")
        );

        assertTrue(GenericWooCommerceCategoryMapper.map(promoted, config).promoted());
    }
}
