package com.tarantulapp.service.vendors.sync;

import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.entity.PartnerListing;
import com.tarantulapp.entity.PartnerListingAvailability;
import com.tarantulapp.entity.PartnerProgramTier;
import com.tarantulapp.repository.OfficialVendorRepository;
import com.tarantulapp.repository.PartnerListingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PartnerListingUpsertServiceTest {

    @Mock
    private OfficialVendorRepository officialVendorRepository;

    @Mock
    private PartnerListingRepository partnerListingRepository;

    private PartnerListingUpsertService service;

    @BeforeEach
    void setUp() {
        service = new PartnerListingUpsertService(officialVendorRepository, partnerListingRepository);
    }

    @Test
    void upsertCreatesListingForEligibleStrategicFounder() {
        UUID vendorId = UUID.randomUUID();
        OfficialVendor vendor = strategicEnabledVendor(vendorId);
        when(officialVendorRepository.findById(vendorId)).thenReturn(Optional.of(vendor));
        when(partnerListingRepository.findByOfficialVendorIdAndExternalId(vendorId, "SKU-1")).thenReturn(Optional.empty());
        when(partnerListingRepository.save(any(PartnerListing.class))).thenAnswer(inv -> inv.getArgument(0));

        PartnerListingUpsertRequest req = new PartnerListingUpsertRequest(
                vendorId,
                "SKU-1",
                "B. hamorii juvenile",
                "Healthy and feeding",
                "Brachypelma hamorii",
                "Brachypelma hamorii",
                1,
                new BigDecimal("125.555"),
                "usd",
                4,
                PartnerListingAvailability.IN_STOCK,
                "https://cdn.example.com/pic.jpg",
                "https://vendor.example.com/products/sku-1",
                "Mexico",
                "CDMX",
                "Ciudad de Mexico",
                Instant.parse("2026-04-23T10:00:00Z"),
                null
        );

        PartnerListing saved = service.upsert(req);

        assertEquals("SKU-1", saved.getExternalId());
        assertEquals("USD", saved.getCurrency());
        assertEquals(new BigDecimal("125.56"), saved.getPriceAmount());
        assertEquals(PartnerListingAvailability.IN_STOCK, saved.getAvailability());
        verify(partnerListingRepository).save(any(PartnerListing.class));
    }

    @Test
    void upsertUpdatesExistingListingByVendorAndExternalId() {
        UUID vendorId = UUID.randomUUID();
        OfficialVendor vendor = strategicEnabledVendor(vendorId);
        PartnerListing existing = new PartnerListing();
        existing.setOfficialVendorId(vendorId);
        existing.setExternalId("SKU-2");
        existing.setTitle("Old title");
        when(officialVendorRepository.findById(vendorId)).thenReturn(Optional.of(vendor));
        when(partnerListingRepository.findByOfficialVendorIdAndExternalId(vendorId, "SKU-2")).thenReturn(Optional.of(existing));
        when(partnerListingRepository.save(any(PartnerListing.class))).thenAnswer(inv -> inv.getArgument(0));

        service.upsert(new PartnerListingUpsertRequest(
                vendorId,
                "SKU-2",
                "New title",
                null,
                null,
                null,
                null,
                null,
                "MXN",
                null,
                null,
                null,
                "https://vendor.example.com/p/sku-2",
                null,
                null,
                null,
                null,
                null
        ));

        ArgumentCaptor<PartnerListing> captor = ArgumentCaptor.forClass(PartnerListing.class);
        verify(partnerListingRepository).save(captor.capture());
        assertEquals("New title", captor.getValue().getTitle());
        assertEquals("SKU-2", captor.getValue().getExternalId());
    }

    @Test
    void upsertRejectsVendorWithoutStrategicImportEnablement() {
        UUID vendorId = UUID.randomUUID();
        OfficialVendor vendor = new OfficialVendor();
        vendor.setId(vendorId);
        vendor.setPartnerProgramTier(PartnerProgramTier.STRATEGIC_FOUNDER);
        vendor.setListingImportEnabled(false);
        when(officialVendorRepository.findById(vendorId)).thenReturn(Optional.of(vendor));

        assertThrows(IllegalArgumentException.class, () -> service.upsert(new PartnerListingUpsertRequest(
                vendorId,
                "SKU-3",
                "Listing",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "https://vendor.example.com/p/sku-3",
                null,
                null,
                null,
                null,
                null
        )));
    }

    @Test
    void upsertCreatesListingForEligibleStrategicPartnerTier() {
        UUID vendorId = UUID.randomUUID();
        OfficialVendor vendor = strategicEnabledVendor(vendorId, PartnerProgramTier.STRATEGIC_PARTNER);
        when(officialVendorRepository.findById(vendorId)).thenReturn(Optional.of(vendor));
        when(partnerListingRepository.findByOfficialVendorIdAndExternalId(vendorId, "SKU-SP1")).thenReturn(Optional.empty());
        when(partnerListingRepository.save(any(PartnerListing.class))).thenAnswer(inv -> inv.getArgument(0));

        PartnerListing saved = service.upsert(new PartnerListingUpsertRequest(
                vendorId,
                "SKU-SP1",
                "Pamphobeteus sling line",
                "Healthy feeding response",
                "Pamphobeteus sp.",
                "Pamphobeteus sp.",
                null,
                new BigDecimal("89.00"),
                "usd",
                2,
                PartnerListingAvailability.IN_STOCK,
                null,
                "https://vendor.example.com/p/sp1",
                "United States",
                "Texas",
                "Austin",
                Instant.parse("2026-04-23T10:00:00Z"),
                null
        ));

        assertEquals("SKU-SP1", saved.getExternalId());
    }

    private OfficialVendor strategicEnabledVendor(UUID vendorId) {
        return strategicEnabledVendor(vendorId, PartnerProgramTier.STRATEGIC_FOUNDER);
    }

    private OfficialVendor strategicEnabledVendor(UUID vendorId, PartnerProgramTier tier) {
        OfficialVendor vendor = new OfficialVendor();
        vendor.setId(vendorId);
        vendor.setPartnerProgramTier(tier);
        vendor.setListingImportEnabled(true);
        return vendor;
    }
}
