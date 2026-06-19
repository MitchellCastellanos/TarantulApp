package com.tarantulapp.service.vendors.adapters;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.service.vendors.sources.StrategicVendorRawListing;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MontrealSpiderCoStrategicPartnerListingAdapterTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final MontrealSpiderCoStrategicPartnerListingAdapter adapter =
            new MontrealSpiderCoStrategicPartnerListingAdapter(objectMapper, true);

    // Trimmed to the shape documented in the Montreal Spider Co integration brief.
    private static final String CATALOG_JSON = """
            [
              {
                "id": "gpulchra",
                "slug": "grammostola-pulchra-brazilian-black",
                "scientific": "Grammostola pulchra",
                "common": { "en": "Brazilian Black", "fr": "Mygale noire du Brésil" },
                "genus": "Grammostola",
                "type": "terrestrial",
                "featured": true,
                "image": "https://res.cloudinary.com/msc/image/upload/gpulchra.jpg",
                "description": { "en": "Glossy all-black terrestrial.", "fr": "Terrestre noire lustrée." },
                "sizes": [
                  { "id": "s", "label": { "en": "Sling (2-3 cm)", "fr": "Jeune (2-3 cm)" }, "price": 65, "stock": 8 },
                  { "id": "j", "label": { "en": "Juvenile (4-6 cm)", "fr": "Juvénile (4-6 cm)" }, "price": 120, "stock": 0 }
                ]
              }
            ]
            """;

    private OfficialVendor vendor() {
        OfficialVendor vendor = new OfficialVendor();
        vendor.setSlug("montreal-spider-co");
        vendor.setName("Montreal Spider Co.");
        vendor.setCountry("Canada");
        vendor.setState("Quebec");
        vendor.setCity("Montreal");
        vendor.setFeedType(MontrealSpiderCoStrategicPartnerListingAdapter.FEED_TYPE);
        vendor.setFeedBaseUrl("https://montrealspider.ca/api/catalog");
        return vendor;
    }

    @Test
    void flattensSizesIntoListingsWithStableExternalIds() throws Exception {
        JsonNode root = objectMapper.readTree(CATALOG_JSON);
        List<StrategicVendorRawListing> items = adapter.mapCatalog(root, vendor(), "https://montrealspider.ca");

        assertEquals(2, items.size(), "Each size tier should become its own listing");

        StrategicVendorRawListing sling = items.get(0);
        assertEquals("grammostola-pulchra-brazilian-black:s", sling.externalId());
        assertEquals("Brazilian Black — Sling (2-3 cm)", sling.title());
        assertEquals("Grammostola pulchra", sling.speciesNameRaw());
        assertEquals(new BigDecimal("65"), sling.priceAmount());
        assertEquals("CAD", sling.currency());
        assertEquals(8, sling.stockQuantity());
        assertEquals("tarantulas", sling.listingCategory());
        assertTrue(sling.promoted(), "featured product should map to promoted");
        assertEquals("https://montrealspider.ca/en/product/grammostola-pulchra-brazilian-black",
                sling.productCanonicalUrl());
        assertEquals("https://res.cloudinary.com/msc/image/upload/gpulchra.jpg", sling.imageUrl());

        StrategicVendorRawListing juvenile = items.get(1);
        assertEquals("grammostola-pulchra-brazilian-black:j", juvenile.externalId());
        assertEquals(0, juvenile.stockQuantity(), "out-of-stock size should keep stock 0");
    }

    @Test
    void supportsRequiresFeedTypeAndCatalogUrl() {
        assertTrue(adapter.supports(vendor()));

        OfficialVendor wrongType = vendor();
        wrongType.setFeedType("shopify");
        assertFalse(adapter.supports(wrongType));

        OfficialVendor noUrl = vendor();
        noUrl.setFeedType(MontrealSpiderCoStrategicPartnerListingAdapter.FEED_TYPE);
        noUrl.setFeedBaseUrl(null);
        noUrl.setWebsiteUrl(null);
        assertFalse(adapter.supports(noUrl));
    }

    @Test
    void appendsCatalogPathWhenOnlySiteOriginProvided() {
        OfficialVendor siteOnly = vendor();
        siteOnly.setFeedBaseUrl("https://montrealspider.ca");
        // supports() returns true because the /api/catalog path is appended internally.
        assertTrue(adapter.supports(siteOnly));
        assertNotNull(siteOnly.getFeedBaseUrl());
    }
}
