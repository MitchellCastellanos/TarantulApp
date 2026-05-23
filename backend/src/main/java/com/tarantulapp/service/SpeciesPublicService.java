package com.tarantulapp.service;

import com.tarantulapp.dto.SpeciesDTO;
import com.tarantulapp.dto.SpeciesSeoSnapshotDTO;
import com.tarantulapp.dto.SpeciesSitemapEntryDTO;
import com.tarantulapp.entity.Species;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.MoltLogRepository;
import com.tarantulapp.repository.SpeciesRepository;
import com.tarantulapp.util.SpeciesSlugUtil;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class SpeciesPublicService {

    private final DiscoverCatalogService discoverCatalogService;
    private final SpeciesRepository speciesRepository;
    private final MarketplaceService marketplaceService;
    private final MoltLogRepository moltLogRepository;
    private final SpeciesTradeNoteService speciesTradeNoteService;

    public SpeciesPublicService(DiscoverCatalogService discoverCatalogService,
                                SpeciesRepository speciesRepository,
                                MarketplaceService marketplaceService,
                                MoltLogRepository moltLogRepository,
                                SpeciesTradeNoteService speciesTradeNoteService) {
        this.discoverCatalogService = discoverCatalogService;
        this.speciesRepository = speciesRepository;
        this.marketplaceService = marketplaceService;
        this.moltLogRepository = moltLogRepository;
        this.speciesTradeNoteService = speciesTradeNoteService;
    }

    @Transactional(readOnly = true)
    public SpeciesSeoSnapshotDTO getSeoSnapshot(String speciesIdOrSlug) {
        SpeciesDTO species = resolvePublicSpecies(speciesIdOrSlug)
                .orElseThrow(() -> new NotFoundException("Species not found in public catalog"));
        String scientificName = species.getScientificName();
        int speciesId = species.getId();

        MarketplaceService.SpeciesMarketplaceSeoSection listings =
                marketplaceService.speciesListingsForSeo(scientificName, speciesId);

        Object[] moltRow = moltLogRepository.aggregateCommunityMoltsBySpeciesId(speciesId);
        long moltCount = moltRow != null && moltRow.length > 0 && moltRow[0] != null
                ? ((Number) moltRow[0]).longValue() : 0L;
        Instant lastMolt = null;
        if (moltRow != null && moltRow.length > 1 && moltRow[1] != null) {
            if (moltRow[1] instanceof Instant instant) {
                lastMolt = instant;
            } else if (moltRow[1] instanceof java.sql.Timestamp ts) {
                lastMolt = ts.toInstant();
            }
        }

        return new SpeciesSeoSnapshotDTO(
                species,
                listings.activeListingCount(),
                listings.recentListings(),
                moltCount,
                lastMolt,
                speciesTradeNoteService.listForSpecies(speciesId)
        );
    }

    @Transactional(readOnly = true)
    public List<SpeciesSitemapEntryDTO> listSitemapEntries(int page, int pageSize) {
        int p = Math.max(0, page);
        int s = Math.min(Math.max(pageSize, 1), 500);
        PageRequest pr = PageRequest.of(p, s, Sort.by(Sort.Direction.ASC, "scientificName"));
        Page<Species> rows = speciesRepository.findAll(DiscoverCatalogService.publicCatalogBaseSpecification(), pr);
        return rows.getContent().stream()
                .map(sp -> new SpeciesSitemapEntryDTO(sp.getId(), sp.getScientificName()))
                .toList();
    }

    private Optional<SpeciesDTO> resolvePublicSpecies(String speciesIdOrSlug) {
        if (speciesIdOrSlug == null || speciesIdOrSlug.isBlank()) {
            return Optional.empty();
        }
        String raw = speciesIdOrSlug.trim();
        try {
            int id = Integer.parseInt(raw);
            return discoverCatalogService.findPublicCatalogById(id);
        } catch (NumberFormatException ignored) {
            // slug lookup below
        }
        String guessedName = raw.replace('-', ' ').replace('_', ' ');
        Optional<SpeciesDTO> byName = speciesRepository.findByScientificNameIgnoreCase(guessedName)
                .filter(DiscoverCatalogService::isPublicCatalogRow)
                .map(SpeciesDTO::from);
        if (byName.isPresent()) {
            return byName;
        }
        return speciesRepository.findAll(DiscoverCatalogService.publicCatalogBaseSpecification()).stream()
                .filter(sp -> SpeciesSlugUtil.slugMatches(sp.getScientificName(), raw))
                .findFirst()
                .map(SpeciesDTO::from);
    }
}
