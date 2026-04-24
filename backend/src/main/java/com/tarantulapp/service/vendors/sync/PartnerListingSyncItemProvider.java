package com.tarantulapp.service.vendors.sync;

import com.tarantulapp.entity.OfficialVendor;

import java.util.List;

public interface PartnerListingSyncItemProvider {
    List<PartnerListingUpsertRequest> fetchItems(OfficialVendor vendor);
}
