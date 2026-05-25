package com.tarantulapp.service.vendors.sync;

import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.entity.PartnerListing;
import com.tarantulapp.entity.PartnerListingAvailability;
import com.tarantulapp.entity.PartnerListingStatus;
import com.tarantulapp.entity.PartnerListingSyncRun;
import com.tarantulapp.entity.PartnerListingSyncRunStatus;
import com.tarantulapp.entity.PartnerListingSyncTriggerSource;
import com.tarantulapp.entity.PartnerProgramTier;
import com.tarantulapp.repository.OfficialVendorRepository;
import com.tarantulapp.repository.PartnerListingRepository;
import com.tarantulapp.repository.PartnerListingSyncRunRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PartnerListingSyncServiceTest {

    @Mock
    private OfficialVendorRepository officialVendorRepository;
    @Mock
    private PartnerListingRepository partnerListingRepository;
    @Mock
    private PartnerListingSyncRunRepository partnerListingSyncRunRepository;
    @Mock
    private PartnerListingUpsertService partnerListingUpsertService;
    @Mock
    private PartnerListingSyncRunService partnerListingSyncRunService;
    @Mock
    private ObjectProvider<PartnerListingSyncItemProvider> itemProvider;

    private PartnerListingSyncService service;

    @BeforeEach
    void setUp() {
        service = new PartnerListingSyncService(
                officialVendorRepository,
                partnerListingSyncRunRepository,
                partnerListingUpsertService,
                partnerListingSyncRunService,
                itemProvider
        );
        when(partnerListingSyncRunService.startRun(any(), any()))
                .thenAnswer(inv -> {
                    PartnerListingSyncRun run = new PartnerListingSyncRun();
                    run.setOfficialVendorId(inv.getArgument(0));
                    run.setTriggerSource(inv.getArgument(1));
                    run.setStatus(PartnerListingSyncRunStatus.RUNNING);
                    return run;
                });
        when(partnerListingSyncRunService.finishRun(any(PartnerListingSyncRun.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void syncMarksOutOfStockAsActiveAndStalesMissingItems() {
        UUID vendorId = UUID.randomUUID();
        when(officialVendorRepository.findById(vendorId)).thenReturn(Optional.of(syncVendor(vendorId)));
        PartnerListing existingMissing = new PartnerListing();
        existingMissing.setOfficialVendorId(vendorId);
        existingMissing.setExternalId("missing-1");
        existingMissing.setStatus(PartnerListingStatus.ACTIVE);
        when(partnerListingSyncRunService.markMissingAsStale(any(), any())).thenReturn(1);

        PartnerListingUpsertRequest item = new PartnerListingUpsertRequest(
                vendorId,
                "sku-1",
                "title",
                "desc",
                null,
                null,
                null,
                new BigDecimal("10.00"),
                "USD",
                0,
                PartnerListingAvailability.IN_STOCK,
                null,
                "https://vendor.example.com/p/sku-1",
                null,
                null,
                null,
                null,
                PartnerListingStatus.ACTIVE,
                "tarantulas",
                false
        );

        PartnerListingSyncRun run = service.syncVendorListings(
                vendorId,
                List.of(item),
                PartnerListingSyncTriggerSource.MANUAL
        );

        ArgumentCaptor<PartnerListingUpsertRequest> upsertCaptor = ArgumentCaptor.forClass(PartnerListingUpsertRequest.class);
        verify(partnerListingUpsertService).upsert(upsertCaptor.capture());
        assertEquals(PartnerListingAvailability.OUT_OF_STOCK, upsertCaptor.getValue().availability());
        assertEquals(PartnerListingStatus.ACTIVE, upsertCaptor.getValue().status());
        assertEquals(1, run.getStaleCount());
        assertEquals(PartnerListingSyncRunStatus.SUCCESS, run.getStatus());
    }

    @Test
    void syncSkipsInvalidExternalIdAndReturnsPartial() {
        UUID vendorId = UUID.randomUUID();
        when(officialVendorRepository.findById(vendorId)).thenReturn(Optional.of(syncVendor(vendorId)));
        when(partnerListingSyncRunService.markMissingAsStale(any(), any())).thenReturn(0);

        PartnerListingSyncRun run = service.syncVendorListings(
                vendorId,
                List.of(new PartnerListingUpsertRequest(
                        vendorId,
                        "   ",
                        "title",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        "https://vendor.example.com/p/sku",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        false
                )),
                PartnerListingSyncTriggerSource.MANUAL
        );

        verify(partnerListingUpsertService, never()).upsert(any());
        assertEquals(1, run.getSkippedCount());
        assertEquals(PartnerListingSyncRunStatus.PARTIAL, run.getStatus());
    }

    private OfficialVendor syncVendor(UUID vendorId) {
        OfficialVendor vendor = new OfficialVendor();
        vendor.setId(vendorId);
        vendor.setSlug("partner-test");
        vendor.setPartnerProgramTier(PartnerProgramTier.OFFICIAL_PARTNER);
        vendor.setListingImportEnabled(true);
        vendor.setEnabled(true);
        return vendor;
    }
}
