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
    void checkoutUrlUsesCartPathWithRepeatedAddToCartParams() {
        Map<String, Object> handoff = service.buildHandoff("monarch-reptiles", List.of(
                new PartnerCartHandoffService.CartLine("101", 2, "Spider A"),
                new PartnerCartHandoffService.CartLine("202", 1, "Spider B")
        ));
        String url = (String) handoff.get("checkoutUrl");
        assertTrue(url.contains("monarchreptiles.com/cart"));
        assertTrue(url.contains("add-to-cart=101"));
        assertTrue(url.contains("add-to-cart=202"));
        assertTrue(url.contains("quantity=2"));
        assertTrue(url.contains("quantity=1"));
        assertTrue(url.contains("utm_source=tarantulapp"));
    }
}
