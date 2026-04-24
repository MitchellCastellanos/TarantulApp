package com.tarantulapp.service.vendors.sources;

import java.math.BigDecimal;

public record StrategicVendorRawListing(
        String externalId,
        String title,
        String description,
        String speciesNameRaw,
        BigDecimal priceAmount,
        String currency,
        Integer stockQuantity,
        String imageUrl,
        String productCanonicalUrl,
        String country,
        String state,
        String city
) {
}
