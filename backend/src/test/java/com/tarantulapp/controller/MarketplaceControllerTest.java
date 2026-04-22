package com.tarantulapp.controller;

import com.tarantulapp.service.MarketplaceService;
import com.tarantulapp.util.SecurityHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MarketplaceControllerTest {

    @Mock
    private MarketplaceService marketplaceService;

    @Mock
    private SecurityHelper securityHelper;

    private MarketplaceController controller;

    @BeforeEach
    void setUp() {
        controller = new MarketplaceController(marketplaceService, securityHelper);
    }

    @Test
    void createListingPassesBoostFlagToService() {
        UUID userId = UUID.randomUUID();
        when(securityHelper.getCurrentUserId()).thenReturn(userId);
        when(marketplaceService.createListing(
                userId,
                "Listing 1",
                "Healthy juvenile",
                "B. hamorii",
                "juvenile",
                "unknown",
                BigDecimal.TEN,
                "USD",
                "Montreal",
                "QC",
                "CA",
                "https://img.test/1.jpg",
                "PED-01",
                true
        )).thenReturn(Map.of("id", UUID.randomUUID(), "title", "Listing 1"));

        MarketplaceController.CreateListingRequest request = new MarketplaceController.CreateListingRequest(
                "Listing 1",
                "Healthy juvenile",
                "B. hamorii",
                "juvenile",
                "unknown",
                BigDecimal.TEN,
                "USD",
                "Montreal",
                "QC",
                "CA",
                "https://img.test/1.jpg",
                "PED-01",
                true
        );

        ResponseEntity<Map<String, Object>> response = controller.createListing(request);

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals("Listing 1", response.getBody().get("title"));
        verify(marketplaceService).createListing(
                userId,
                "Listing 1",
                "Healthy juvenile",
                "B. hamorii",
                "juvenile",
                "unknown",
                BigDecimal.TEN,
                "USD",
                "Montreal",
                "QC",
                "CA",
                "https://img.test/1.jpg",
                "PED-01",
                true
        );
    }

    @Test
    void registerQrPrintReturnsOkMessage() {
        UUID userId = UUID.randomUUID();
        when(securityHelper.getCurrentUserId()).thenReturn(userId);

        ResponseEntity<Map<String, String>> response = controller.registerQrPrint();

        assertEquals(200, response.getStatusCode().value());
        assertNotNull(response.getBody());
        assertEquals("ok", response.getBody().get("message"));
        verify(marketplaceService).registerQrPrintExport(userId);
    }
}
