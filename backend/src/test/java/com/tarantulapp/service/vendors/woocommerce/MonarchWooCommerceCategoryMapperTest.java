package com.tarantulapp.service.vendors.woocommerce;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tarantulapp.marketplace.MarketplaceListingCategories;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class MonarchWooCommerceCategoryMapperTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void mapsExplicitTarantulaSlugsOnly() throws Exception {
        var product = mapper.readTree("""
                {
                  "name": "Brachypelma hamorii",
                  "categories": [{"slug": "tarantulas"}, {"slug": "new-world"}]
                }
                """);
        MonarchWooCommerceCategoryMapper.MappedProduct mapped = MonarchWooCommerceCategoryMapper.map(product);
        assertNotNull(mapped);
        assertEquals(MarketplaceListingCategories.TARANTULAS, mapped.listingCategory());
    }

    @Test
    void skipsJumpingSpidersMillipedesAndGenericInvertebrates() throws Exception {
        assertNull(MonarchWooCommerceCategoryMapper.map(mapper.readTree("""
                {"name": "Phidippus audax", "categories": [{"slug": "jumping-spiders"}]}
                """)));
        assertNull(MonarchWooCommerceCategoryMapper.map(mapper.readTree("""
                {"name": "Narceus Americanus Millipede", "categories": [{"slug": "invertebrates"}]}
                """)));
        assertNull(MonarchWooCommerceCategoryMapper.map(mapper.readTree("""
                {"name": "Exo Terra", "categories": [{"slug": "terrariums"}]}
                """)));
    }
}
