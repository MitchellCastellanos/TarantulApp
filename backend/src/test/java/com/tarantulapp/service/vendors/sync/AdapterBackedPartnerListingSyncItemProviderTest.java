package com.tarantulapp.service.vendors.sync;

import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.entity.PartnerListingAvailability;
import com.tarantulapp.entity.PartnerListingStatus;
import com.tarantulapp.service.vendors.adapters.StrategicPartnerListingAdapter;
import com.tarantulapp.service.vendors.normalizers.StrategicPartnerListingNormalizer;
import com.tarantulapp.service.vendors.sources.StrategicVendorRawListing;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AdapterBackedPartnerListingSyncItemProviderTest {

    @Test
    void providerUsesFirstSupportingAdapterAndNormalizes() {
        StrategicPartnerListingAdapter adapter = mock(StrategicPartnerListingAdapter.class);
        StrategicPartnerListingNormalizer normalizer = mock(StrategicPartnerListingNormalizer.class);
        AdapterBackedPartnerListingSyncItemProvider provider = new AdapterBackedPartnerListingSyncItemProvider(
                List.of(adapter),
                normalizer
        );
        OfficialVendor vendor = new OfficialVendor();
        UUID vendorId = UUID.randomUUID();
        vendor.setId(vendorId);

        StrategicVendorRawListing raw = new StrategicVendorRawListing(
                "sku-1", "title", null, null, new BigDecimal("1.00"),
                "USD", 1, null, "https://partner.example.com/p/1", null, null, null
        );
        PartnerListingUpsertRequest req = new PartnerListingUpsertRequest(
                vendorId, "sku-1", "title", null, null, null, null, new BigDecimal("1.00"),
                "USD", 1, PartnerListingAvailability.IN_STOCK, null,
                "https://partner.example.com/p/1", null, null, null, Instant.now(), PartnerListingStatus.ACTIVE
        );
        when(adapter.supports(vendor)).thenReturn(true);
        when(adapter.fetch(vendor)).thenReturn(List.of(raw));
        when(normalizer.normalize(vendorId, raw)).thenReturn(req);

        List<PartnerListingUpsertRequest> out = provider.fetchItems(vendor);
        assertEquals(1, out.size());
        assertEquals("sku-1", out.get(0).externalId());
    }

    @Test
    void providerReturnsEmptyWhenNoAdapterSupportsVendor() {
        StrategicPartnerListingAdapter adapter = mock(StrategicPartnerListingAdapter.class);
        StrategicPartnerListingNormalizer normalizer = mock(StrategicPartnerListingNormalizer.class);
        AdapterBackedPartnerListingSyncItemProvider provider = new AdapterBackedPartnerListingSyncItemProvider(
                List.of(adapter),
                normalizer
        );
        OfficialVendor vendor = new OfficialVendor();
        when(adapter.supports(any())).thenReturn(false);

        assertEquals(0, provider.fetchItems(vendor).size());
    }
}
