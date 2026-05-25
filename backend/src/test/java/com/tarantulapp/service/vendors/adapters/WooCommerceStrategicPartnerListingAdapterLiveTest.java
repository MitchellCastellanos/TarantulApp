package com.tarantulapp.service.vendors.adapters;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.service.vendors.sources.StrategicVendorRawListing;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Live smoke test against Monarch WooCommerce (run with MONARCH_LIVE_TEST=true).
 */
@EnabledIfEnvironmentVariable(named = "MONARCH_LIVE_TEST", matches = "true")
class WooCommerceStrategicPartnerListingAdapterLiveTest {

    @Test
    void fetchMapsCatalogFromMonarchStore() {
        WooCommerceStrategicPartnerListingAdapter adapter = new WooCommerceStrategicPartnerListingAdapter(
                new ObjectMapper(),
                true,
                100,
                80
        );
        OfficialVendor vendor = new OfficialVendor();
        vendor.setSlug("monarch-reptiles");
        vendor.setCountry("Canada");
        vendor.setState("Quebec");
        vendor.setFeedType("woocommerce");
        vendor.setFeedBaseUrl("https://monarchreptiles.com");

        List<StrategicVendorRawListing> items = adapter.fetch(vendor);
        assertFalse(items.isEmpty(), "Expected mapped Monarch listings");

        Map<String, Integer> byCategory = new HashMap<>();
        int promoted = 0;
        for (StrategicVendorRawListing item : items) {
            String cat = item.listingCategory() == null ? "skipped" : item.listingCategory();
            byCategory.merge(cat, 1, Integer::sum);
            if (item.promoted()) promoted++;
        }

        System.out.println("Monarch mapped total: " + items.size());
        System.out.println("By category: " + byCategory);
        System.out.println("Tarantula Cribs promoted: " + promoted);
        assertTrue(byCategory.getOrDefault("tarantulas", 0) > 0, "Expected tarantulas");
    }
}
