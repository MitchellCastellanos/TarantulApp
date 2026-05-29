package com.tarantulapp.service.vendors.sync;

import com.tarantulapp.entity.PartnerListing;

public record PartnerListingUpsertResult(
        PartnerListing listing,
        PartnerListingUpsertChange change,
        String changeDetail
) {
}
