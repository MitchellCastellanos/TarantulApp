package com.tarantulapp.service;

import com.tarantulapp.dto.SpeciesDTO;
import com.tarantulapp.dto.SpeciesSeoSnapshotDTO;
import com.tarantulapp.repository.MoltLogRepository;
import com.tarantulapp.repository.SpeciesRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpeciesPublicServiceTest {

    @Mock
    private DiscoverCatalogService discoverCatalogService;
    @Mock
    private SpeciesRepository speciesRepository;
    @Mock
    private MarketplaceService marketplaceService;
    @Mock
    private MoltLogRepository moltLogRepository;
    @Mock
    private SpeciesTradeNoteService speciesTradeNoteService;

    private SpeciesPublicService service;

    @BeforeEach
    void setUp() {
        service = new SpeciesPublicService(
                discoverCatalogService, speciesRepository, marketplaceService, moltLogRepository,
                speciesTradeNoteService);
    }

    @Test
    void getSeoSnapshotReturnsCountsAndListings() {
        var entity = new com.tarantulapp.entity.Species();
        entity.setId(1);
        entity.setScientificName("Grammostola rosea");
        entity.setDataSource("gbif");
        when(discoverCatalogService.findPublicCatalogById(1)).thenReturn(Optional.of(SpeciesDTO.from(entity)));
        when(marketplaceService.speciesListingsForSeo("Grammostola rosea", 1))
                .thenReturn(new MarketplaceService.SpeciesMarketplaceSeoSection(
                        3,
                        List.of(Map.of("id", UUID.randomUUID(), "title", "Juvenile G. rosea", "source", "peer"))
                ));
        when(moltLogRepository.aggregateCommunityMoltsBySpeciesId(1))
                .thenReturn(new Object[]{2L, Instant.parse("2025-01-15T12:00:00Z")});
        when(speciesTradeNoteService.listForSpecies(1)).thenReturn(List.of());

        SpeciesSeoSnapshotDTO snap = service.getSeoSnapshot("1");

        assertNotNull(snap);
        assertEquals(1, snap.species().getId());
        assertEquals(3, snap.activeListingCount());
        assertEquals(1, snap.recentListings().size());
        assertEquals(2, snap.communityMoltCount());
        assertNotNull(snap.lastCommunityMoltAt());
    }

    @Test
    void getSeoSnapshotBySlugResolvesScientificName() {
        var entity = new com.tarantulapp.entity.Species();
        entity.setId(42);
        entity.setScientificName("Avicularia avicularia");
        entity.setDataSource("gbif");
        when(speciesRepository.findByScientificNameIgnoreCase("avicularia avicularia"))
                .thenReturn(Optional.of(entity));
        when(marketplaceService.speciesListingsForSeo(eq("Avicularia avicularia"), eq(42)))
                .thenReturn(new MarketplaceService.SpeciesMarketplaceSeoSection(0, List.of()));
        when(moltLogRepository.aggregateCommunityMoltsBySpeciesId(42))
                .thenReturn(new Object[]{0L, null});
        when(speciesTradeNoteService.listForSpecies(42)).thenReturn(List.of());

        SpeciesSeoSnapshotDTO snap = service.getSeoSnapshot("avicularia-avicularia");
        assertEquals(42, snap.species().getId());
    }
}
