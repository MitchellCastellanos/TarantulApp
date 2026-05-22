package com.tarantulapp.service;

import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.repository.OfficialVendorRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PartnerCartHandoffServiceTest {

    @Mock
    private OfficialVendorRepository officialVendorRepository;

    private PartnerCartHandoffService service;

    @BeforeEach
    void setUp() {
        service = new PartnerCartHandoffService(officialVendorRepository, "https://monarchreptiles.com");
        OfficialVendor vendor = new OfficialVendor();
        vendor.setId(UUID.randomUUID());
        vendor.setSlug("monarch-reptiles");
        vendor.setName("Monarch Reptiles");
        when(officialVendorRepository.findBySlug("monarch-reptiles")).thenReturn(Optional.of(vendor));
    }

    @Test
    void singleItemUsesProductPageAddToCart() {
        Map<String, Object> handoff = service.buildHandoff("monarch-reptiles", List.of(
                new PartnerCartHandoffService.CartLine(
                        "29661", 1, "Spider",
                        "https://monarchreptiles.com/product/test-spider/")));
        assertEquals("product_page_add", handoff.get("handoffMode"));
        String url = (String) handoff.get("checkoutUrl");
        assertTrue(url.contains("/product/test-spider"));
        assertTrue(url.contains("add-to-cart=29661"));
    }

    @Test
    void multiItemNeverUsesCommaBatchUrl() {
        Map<String, Object> handoff = service.buildHandoff("monarch-reptiles", List.of(
                new PartnerCartHandoffService.CartLine("101", 1, "A", "https://monarchreptiles.com/product/a/"),
                new PartnerCartHandoffService.CartLine("202", 2, "B", "https://monarchreptiles.com/product/b/")));
        assertEquals("product_pages_stepped", handoff.get("handoffMode"));
        String checkout = (String) handoff.get("checkoutUrl");
        assertTrue(checkout.contains("/cart"));
        assertFalse(checkout.contains("add-to-cart"));
        @SuppressWarnings("unchecked")
        List<String> addUrls = (List<String>) handoff.get("addToCartUrls");
        assertEquals(2, addUrls.size());
        assertTrue(addUrls.get(0).contains("add-to-cart=101"));
    }
}
