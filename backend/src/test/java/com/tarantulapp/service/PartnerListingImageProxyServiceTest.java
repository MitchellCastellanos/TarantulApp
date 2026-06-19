package com.tarantulapp.service;

import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.repository.OfficialVendorRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.net.URI;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PartnerListingImageProxyServiceTest {

    @Mock
    private OfficialVendorRepository officialVendorRepository;

    private PartnerListingImageProxyService service() {
        return new PartnerListingImageProxyService(officialVendorRepository);
    }

    @Test
    void allowsCloudinaryCdnWithoutVendorMatch() {
        // Montreal Spider Co serves catalog photos from Cloudinary, a different host than its store.
        URI uri = service().validateUrl(
                "https://res.cloudinary.com/dszbbbola/image/upload/v1/montreal-spider-co/x.png");
        assertEquals("res.cloudinary.com", uri.getHost());
    }

    @Test
    void allowsVendorStoreDomain() {
        OfficialVendor vendor = new OfficialVendor();
        vendor.setFeedBaseUrl("https://www.montrealspider.ca/api/catalog");
        when(officialVendorRepository.findAll()).thenReturn(List.of(vendor));

        URI uri = service().validateUrl("https://www.montrealspider.ca/img/photo.jpg");
        assertEquals("www.montrealspider.ca", uri.getHost());
    }

    @Test
    void allowsPerVendorConfiguredImageHost() {
        OfficialVendor vendor = new OfficialVendor();
        vendor.setFeedConfig(Map.of("imageHosts", List.of("media.example.com")));
        when(officialVendorRepository.findAll()).thenReturn(List.of(vendor));

        URI uri = service().validateUrl("https://media.example.com/p/1.jpg");
        assertEquals("media.example.com", uri.getHost());
    }

    @Test
    void rejectsUnknownHost() {
        when(officialVendorRepository.findAll()).thenReturn(List.of());
        assertThrows(IllegalArgumentException.class,
                () -> service().validateUrl("https://evil.example.com/x.png"));
    }

    @Test
    void rejectsNonHttpScheme() {
        assertThrows(IllegalArgumentException.class,
                () -> service().validateUrl("ftp://res.cloudinary.com/x.png"));
    }
}
