package com.tarantulapp.service.vendors.sync;

import com.tarantulapp.entity.PartnerListingAvailability;
import com.tarantulapp.entity.PartnerListingStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PartnerListingUpsertRequest(
        UUID officialVendorId,
        String externalId,
        String title,
        String description,
        String speciesNameRaw,
        String speciesNormalized,
        Integer speciesId,
        BigDecimal priceAmount,
        String currency,
        Integer stockQuantity,
        PartnerListingAvailability availability,
        String imageUrl,
        String productCanonicalUrl,
        String country,
        String state,
        String city,
        Instant lastSyncedAt,
        PartnerListingStatus status
) {
}
