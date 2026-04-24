package com.tarantulapp.service.vendors.adapters;

import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.service.vendors.sources.StrategicVendorRawListing;

import java.util.List;

public interface StrategicPartnerListingAdapter {
    boolean supports(OfficialVendor vendor);
    List<StrategicVendorRawListing> fetch(OfficialVendor vendor);
    String id();
}
