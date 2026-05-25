package com.tarantulapp.service;

import com.tarantulapp.repository.MarketplaceListingRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VendorMxTierServiceTest {

    @Mock
    private MarketplaceListingRepository marketplaceListingRepository;

    @InjectMocks
    private VendorMxTierService service;

    @Test
    void tierFromSoldCountMatchesRanges() {
        UUID seller = UUID.randomUUID();
        when(marketplaceListingRepository.countSoldBySellerSince(eq(seller), any())).thenReturn(0L);
        assertEquals(VendorMxTier.STARTER, service.currentTier(seller));

        when(marketplaceListingRepository.countSoldBySellerSince(eq(seller), any())).thenReturn(5L);
        assertEquals(VendorMxTier.ACTIVO, service.currentTier(seller));

        when(marketplaceListingRepository.countSoldBySellerSince(eq(seller), any())).thenReturn(20L);
        assertEquals(VendorMxTier.PLUS, service.currentTier(seller));

        when(marketplaceListingRepository.countSoldBySellerSince(eq(seller), any())).thenReturn(40L);
        assertEquals(VendorMxTier.PRO_SHOP, service.currentTier(seller));
    }
}
