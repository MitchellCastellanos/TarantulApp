package com.tarantulapp.service.vendors.sync;

import com.tarantulapp.entity.PartnerListing;
import com.tarantulapp.entity.PartnerListingAvailability;
import com.tarantulapp.entity.PartnerListingStatus;
import com.tarantulapp.entity.PartnerListingSyncRun;
import com.tarantulapp.entity.PartnerListingSyncRunStatus;
import com.tarantulapp.entity.PartnerListingSyncTriggerSource;
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
    private ObjectProvider<PartnerListingSyncItemProvider> itemProvider;

    private PartnerListingSyncService service;

    @BeforeEach
    void setUp() {
        service = new PartnerListingSyncService(
                officialVendorRepository,
                partnerListingRepository,
                partnerListingSyncRunRepository,
                partnerListingUpsertService,
                itemProvider
        );
        when(partnerListingSyncRunRepository.save(any(PartnerListingSyncRun.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void syncMarksOutOfStockAsHiddenAndStalesMissingItems() {
        UUID vendorId = UUID.randomUUID();
        PartnerListing existingMissing = new PartnerListing();
        existingMissing.setOfficialVendorId(vendorId);
        existingMissing.setExternalId("missing-1");
        existingMissing.setStatus(PartnerListingStatus.ACTIVE);
        when(partnerListingRepository.findByOfficialVendorId(vendorId)).thenReturn(List.of(existingMissing));

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
                PartnerListingStatus.ACTIVE
        );

        PartnerListingSyncRun run = service.syncVendorListings(
                vendorId,
                List.of(item),
                PartnerListingSyncTriggerSource.MANUAL
        );

        ArgumentCaptor<PartnerListingUpsertRequest> upsertCaptor = ArgumentCaptor.forClass(PartnerListingUpsertRequest.class);
        verify(partnerListingUpsertService).upsert(upsertCaptor.capture());
        assertEquals(PartnerListingAvailability.OUT_OF_STOCK, upsertCaptor.getValue().availability());
        assertEquals(PartnerListingStatus.HIDDEN, upsertCaptor.getValue().status());
        assertEquals(1, run.getStaleCount());
        assertEquals(PartnerListingSyncRunStatus.SUCCESS, run.getStatus());
    }

    @Test
    void syncSkipsInvalidExternalIdAndReturnsPartial() {
        UUID vendorId = UUID.randomUUID();
        when(partnerListingRepository.findByOfficialVendorId(vendorId)).thenReturn(List.of());

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
                        null
                )),
                PartnerListingSyncTriggerSource.MANUAL
        );

        verify(partnerListingUpsertService, never()).upsert(any());
        assertEquals(1, run.getSkippedCount());
        assertEquals(PartnerListingSyncRunStatus.PARTIAL, run.getStatus());
    }
}
