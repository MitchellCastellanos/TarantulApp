package com.tarantulapp.service.vendors;

import com.tarantulapp.marketplace.MarketplaceListingCategories;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PartnerListingTarantulaFilterTest {

    @Test
    void monarchListingRejectsMillipedeTitle() {
        assertFalse(PartnerListingTarantulaFilter.isTarantulaAnimalListing(
                "Narceus Americanus Millipede",
                null,
                MarketplaceListingCategories.TARANTULAS,
                PartnerListingTarantulaFilter.MONARCH_VENDOR_SLUG));
    }

    @Test
    void monarchListingAcceptsTarantula() {
        assertTrue(PartnerListingTarantulaFilter.isTarantulaAnimalListing(
                "Brachypelma hamorii 3\"",
                null,
                MarketplaceListingCategories.TARANTULAS,
                PartnerListingTarantulaFilter.MONARCH_VENDOR_SLUG));
    }
}
