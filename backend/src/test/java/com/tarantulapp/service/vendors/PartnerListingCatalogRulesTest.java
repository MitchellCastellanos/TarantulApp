package com.tarantulapp.service.vendors;

import com.tarantulapp.marketplace.MarketplaceListingCategories;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PartnerListingCatalogRulesTest {

    @Test
    void rejectsBlockedSpecimensForAnyPartnerCatalog() {
        assertFalse(PartnerListingCatalogRules.isAllowedListing(
                "Narceus Americanus Millipede",
                null,
                MarketplaceListingCategories.TARANTULAS,
                Map.of()));
        assertFalse(PartnerListingCatalogRules.isAllowedListing(
                "Phidippus audax - Bold Jumping Spider",
                null,
                MarketplaceListingCategories.TARANTULAS,
                Map.of()));
    }

    @Test
    void honorsAllowedCategoriesFromFeedConfig() {
        Map<String, Object> tarantulasOnly = Map.of("allowedCategories", List.of("tarantulas"));

        assertTrue(PartnerListingCatalogRules.isAllowedListing(
                "Brachypelma hamorii",
                null,
                MarketplaceListingCategories.TARANTULAS,
                tarantulasOnly));
        assertFalse(PartnerListingCatalogRules.isAllowedListing(
                "Exo Terra 12x12x12",
                null,
                MarketplaceListingCategories.TERRARIUMS,
                tarantulasOnly));
    }
}
