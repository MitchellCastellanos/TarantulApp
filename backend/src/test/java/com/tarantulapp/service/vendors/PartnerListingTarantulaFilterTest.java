package com.tarantulapp.service.vendors;

import com.tarantulapp.marketplace.MarketplaceListingCategories;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PartnerListingTarantulaFilterTest {

    @Test
    void rejectsNonTarantulaSpecimens() {
        assertFalse(PartnerListingTarantulaFilter.isAllowedMonarchListing(
                "Narceus Americanus Millipede",
                null,
                MarketplaceListingCategories.TARANTULAS,
                PartnerListingTarantulaFilter.MONARCH_VENDOR_SLUG));
        assertFalse(PartnerListingTarantulaFilter.isAllowedMonarchListing(
                "Phidippus audax - Bold Jumping Spider",
                null,
                MarketplaceListingCategories.TARANTULAS,
                PartnerListingTarantulaFilter.MONARCH_VENDOR_SLUG));
    }

    @Test
    void allowsTarantulasAndSupplies() {
        assertTrue(PartnerListingTarantulaFilter.isAllowedMonarchListing(
                "Brachypelma hamorii 3\"",
                null,
                MarketplaceListingCategories.TARANTULAS,
                PartnerListingTarantulaFilter.MONARCH_VENDOR_SLUG));
        assertTrue(PartnerListingTarantulaFilter.isAllowedMonarchListing(
                "Exo Terra 12x12x12",
                null,
                MarketplaceListingCategories.TERRARIUMS,
                PartnerListingTarantulaFilter.MONARCH_VENDOR_SLUG));
        assertTrue(PartnerListingTarantulaFilter.isAllowedMonarchListing(
                "Dubia roaches 100 count",
                null,
                MarketplaceListingCategories.LIVE_FOOD,
                PartnerListingTarantulaFilter.MONARCH_VENDOR_SLUG));
    }
}
