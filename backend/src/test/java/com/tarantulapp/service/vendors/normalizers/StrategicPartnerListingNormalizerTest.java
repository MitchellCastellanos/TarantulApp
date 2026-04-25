package com.tarantulapp.service.vendors.normalizers;

import com.tarantulapp.entity.Species;
import com.tarantulapp.repository.SpeciesRepository;
import com.tarantulapp.service.vendors.sources.StrategicVendorRawListing;
import com.tarantulapp.service.vendors.sync.PartnerListingUpsertRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class StrategicPartnerListingNormalizerTest {

    @Mock
    private SpeciesRepository speciesRepository;

    private StrategicPartnerListingNormalizer normalizer;

    @BeforeEach
    void setUp() {
        normalizer = new StrategicPartnerListingNormalizer(speciesRepository);
    }

    @Test
    void normalizeMapsSpeciesCurrencyPriceAndImage() {
        Species species = new Species();
        species.setId(77);
        when(speciesRepository.findByScientificNameIgnoreCase("Brachypelma hamorii"))
                .thenReturn(Optional.of(species));

        PartnerListingUpsertRequest out = normalizer.normalize(UUID.randomUUID(), new StrategicVendorRawListing(
                " sku-1 ",
                " Listing title ",
                " Desc ",
                "  brachypelma   hamorii ",
                new BigDecimal("12.345"),
                "mx$",
                8,
                "https://cdn.example.com/image.jpg",
                "https://partner.example.com/p/sku-1",
                "Mexico",
                "Jalisco",
                "Zapopan"
        ));

        assertEquals("sku-1", out.externalId());
        assertEquals("Brachypelma hamorii", out.speciesNormalized());
        assertEquals(77, out.speciesId());
        assertEquals("MXN", out.currency());
        assertEquals(new BigDecimal("12.35"), out.priceAmount());
    }

    @Test
    void normalizeDropsInvalidImageUrl() {
        PartnerListingUpsertRequest out = normalizer.normalize(UUID.randomUUID(), new StrategicVendorRawListing(
                "sku-2",
                "Listing",
                null,
                null,
                null,
                "usd",
                null,
                "ftp://example.com/bad.jpg",
                "https://partner.example.com/p/sku-2",
                null,
                null,
                null
        ));

        assertNull(out.imageUrl());
    }
}
