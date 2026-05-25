package com.tarantulapp.service;

import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.repository.OfficialVendorRepository;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PartnerListingImageProxyServiceTest {

    @Test
    void validatesAnyConfiguredPartnerHost() throws Exception {
        OfficialVendorRepository repo = mock(OfficialVendorRepository.class);
        OfficialVendor vendor = new OfficialVendor();
        vendor.setFeedBaseUrl("https://shop.example.com");
        vendor.setWebsiteUrl("https://vendor.example.com");
        when(repo.findAll()).thenReturn(List.of(vendor));
        PartnerListingImageProxyService service = new PartnerListingImageProxyService(repo);

        Method validate = PartnerListingImageProxyService.class.getDeclaredMethod("validateUrl", String.class);
        validate.setAccessible(true);

        assertDoesNotThrow(() -> validate.invoke(service, "https://cdn.shop.example.com/image.jpg"));
        assertThrows(Exception.class, () -> validate.invoke(service, "https://not-a-partner.example/image.jpg"));
    }
}
