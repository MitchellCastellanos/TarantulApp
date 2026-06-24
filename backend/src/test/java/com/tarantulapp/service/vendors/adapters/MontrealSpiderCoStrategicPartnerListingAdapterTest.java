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
import static org.junit.jupiter.api.Assertions.assertNull;
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
    void flattensAvailabilityIntoListingsWithStableExternalIds() throws Exception {
        String liveJson = """
                [
                  {
                    "slug": "tliltocatl-vagans-mexican-red-rump",
                    "scientific": "Tliltocatl vagans",
                    "common": { "en": "Mexican Red Rump", "fr": "Croupe rouge du Mexique" },
                    "featured": false,
                    "image": "https://res.cloudinary.com/msc/default.jpg",
                    "description": { "en": "Classic beginner species.", "fr": "Espèce classique pour débutants." },
                    "availability": [
                      {
                        "key": "6:unsexed:59",
                        "sizeLabel": "2 3/8″",
                        "sex": "unsexed",
                        "price": 59,
                        "stock": 2
                      },
                      {
                        "key": "8:unsexed:64",
                        "sizeLabel": "3 1/8″",
                        "sex": "unsexed",
                        "price": 64,
                        "stock": 1,
                        "photo": "https://res.cloudinary.com/msc/tier.jpg"
                      }
                    ]
                  },
                  {
                    "slug": "psalmopoeus-irminia-venezuelan-suntiger",
                    "scientific": "Psalmopoeus irminia",
                    "common": { "en": "Venezuelan Suntiger", "fr": "Tigre solaire du Venezuela" },
                    "availability": []
                  }
                ]
                """;
        JsonNode root = objectMapper.readTree(liveJson);
        List<StrategicVendorRawListing> items = adapter.mapCatalog(root, vendor(), "https://www.montrealspider.ca");

        assertEquals(2, items.size(), "Empty availability[] should be skipped; each tier becomes a listing");

        StrategicVendorRawListing small = items.get(0);
        assertEquals("tliltocatl-vagans-mexican-red-rump:6:unsexed:59", small.externalId());
        assertEquals("Mexican Red Rump — 2 3/8″", small.title());
        assertEquals(new BigDecimal("59"), small.priceAmount());
        assertEquals(2, small.stockQuantity());
        assertEquals("https://res.cloudinary.com/msc/default.jpg", small.imageUrl());

        StrategicVendorRawListing large = items.get(1);
        assertEquals("tliltocatl-vagans-mexican-red-rump:8:unsexed:64", large.externalId());
        assertEquals("https://res.cloudinary.com/msc/tier.jpg", large.imageUrl());
    }

    @Test
    void resolvesImagesAcrossCommonFieldShapes() throws Exception {
        String base = "https://montrealspider.ca";

        assertEquals("https://res.cloudinary.com/msc/a.jpg",
                MontrealSpiderCoStrategicPartnerListingAdapter.resolveImageUrl(
                        objectMapper.readTree("{\"image\":\"https://res.cloudinary.com/msc/a.jpg\"}"), base));

        // Alternate string field name.
        assertEquals("https://res.cloudinary.com/msc/b.jpg",
                MontrealSpiderCoStrategicPartnerListingAdapter.resolveImageUrl(
                        objectMapper.readTree("{\"imageUrl\":\"https://res.cloudinary.com/msc/b.jpg\"}"), base));

        // Array of Cloudinary-style objects -> first secure_url.
        assertEquals("https://res.cloudinary.com/msc/c.jpg",
                MontrealSpiderCoStrategicPartnerListingAdapter.resolveImageUrl(
                        objectMapper.readTree(
                                "{\"images\":[{\"secure_url\":\"https://res.cloudinary.com/msc/c.jpg\"}]}"), base));

        // Relative /public path absolutized against the site base.
        assertEquals("https://montrealspider.ca/images/species/x.png",
                MontrealSpiderCoStrategicPartnerListingAdapter.resolveImageUrl(
                        objectMapper.readTree("{\"image\":\"/images/species/x.png\"}"), base));

        // No image present.
        assertNull(MontrealSpiderCoStrategicPartnerListingAdapter.resolveImageUrl(
                objectMapper.readTree("{\"slug\":\"no-image\"}"), base));
    }

    @Test
    void siteBaseReducesToOriginSoProductUrlsAreNotDoubledWithLocale() {
        // Vendor website carries a locale path; product links must not become /en/en/product/...
        OfficialVendor localized = vendor();
        localized.setWebsiteUrl("https://www.montrealspider.ca/en");
        String siteBase = adapter.resolveSiteBaseUrl(localized, "https://www.montrealspider.ca/api/catalog");
        assertEquals("https://www.montrealspider.ca", siteBase);
        assertEquals("https://www.montrealspider.ca/en/product/some-slug", siteBase + "/en/product/some-slug");
    }

    @Test
    void siteBaseFallsBackToCatalogOriginWhenNoWebsite() {
        OfficialVendor noSite = vendor();
        noSite.setWebsiteUrl(null);
        assertEquals("https://www.montrealspider.ca",
                adapter.resolveSiteBaseUrl(noSite, "https://www.montrealspider.ca/api/catalog"));
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
