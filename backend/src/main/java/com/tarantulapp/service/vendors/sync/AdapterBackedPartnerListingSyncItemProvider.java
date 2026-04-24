package com.tarantulapp.service.vendors.sync;

import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.service.vendors.adapters.StrategicPartnerListingAdapter;
import com.tarantulapp.service.vendors.normalizers.StrategicPartnerListingNormalizer;
import com.tarantulapp.service.vendors.sources.StrategicVendorRawListing;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class AdapterBackedPartnerListingSyncItemProvider implements PartnerListingSyncItemProvider {
    private static final Logger log = LoggerFactory.getLogger(AdapterBackedPartnerListingSyncItemProvider.class);

    private final List<StrategicPartnerListingAdapter> adapters;
    private final StrategicPartnerListingNormalizer normalizer;

    public AdapterBackedPartnerListingSyncItemProvider(List<StrategicPartnerListingAdapter> adapters,
                                                       StrategicPartnerListingNormalizer normalizer) {
        this.adapters = adapters;
        this.normalizer = normalizer;
    }

    @Override
    public List<PartnerListingUpsertRequest> fetchItems(OfficialVendor vendor) {
        if (vendor == null) return List.of();
        StrategicPartnerListingAdapter adapter = adapters.stream()
                .filter(a -> a.supports(vendor))
                .findFirst()
                .orElse(null);
        if (adapter == null) {
            return List.of();
        }
        try {
            List<StrategicVendorRawListing> rawItems = adapter.fetch(vendor);
            List<PartnerListingUpsertRequest> out = new ArrayList<>();
            for (StrategicVendorRawListing raw : rawItems) {
                PartnerListingUpsertRequest request = normalizer.normalize(vendor.getId(), raw);
                if (request != null) out.add(request);
            }
            return out;
        } catch (Exception ex) {
            log.warn("Partner provider failed for vendor {} with adapter {}: {}",
                    vendor.getId(), adapter.id(), ex.getMessage());
            return List.of();
        }
    }
}
