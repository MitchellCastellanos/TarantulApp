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
    void mapsTarantulasAndHusbandrySupplies() throws Exception {
        var tarantula = mapper.readTree("""
                {"name": "Brachypelma hamorii", "categories": [{"slug": "tarantulas"}, {"slug": "new-world"}]}
                """);
        assertEquals(MarketplaceListingCategories.TARANTULAS, MonarchWooCommerceCategoryMapper.map(tarantula).listingCategory());

        var terrarium = mapper.readTree("""
                {"name": "Exo Terra enclosure", "categories": [{"slug": "terrariums"}]}
                """);
        assertEquals(MarketplaceListingCategories.TERRARIUMS, MonarchWooCommerceCategoryMapper.map(terrarium).listingCategory());

        var feeders = mapper.readTree("""
                {"name": "Dubia roaches", "categories": [{"slug": "feeder-insects"}]}
                """);
        assertEquals(MarketplaceListingCategories.LIVE_FOOD, MonarchWooCommerceCategoryMapper.map(feeders).listingCategory());
    }

    @Test
    void skipsOtherLivePets() throws Exception {
        assertNull(MonarchWooCommerceCategoryMapper.map(mapper.readTree("""
                {"name": "Phidippus audax", "categories": [{"slug": "jumping-spiders"}]}
                """)));
        assertNull(MonarchWooCommerceCategoryMapper.map(mapper.readTree("""
                {"name": "Narceus Americanus Millipede", "categories": [{"slug": "invertebrates"}]}
                """)));
    }
}
