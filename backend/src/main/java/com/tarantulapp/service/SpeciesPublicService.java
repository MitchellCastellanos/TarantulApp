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

        Object[] moltRow = firstNativeAggregateRow(
                moltLogRepository.aggregateCommunityMoltsBySpeciesId(speciesId));
        long moltCount = longAt(moltRow, 0);
        Instant lastMolt = instantAt(moltRow, 1);

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

    /**
     * Native queries may return {@code List<Object[]>} where Hibernate nests the row
     * (e.g. {@code [[count, max]]}) — unwrap to a flat column array.
     */
    static Object[] firstNativeAggregateRow(List<Object[]> rows) {
        if (rows == null || rows.isEmpty()) {
            return null;
        }
        Object[] row = rows.get(0);
        if (row != null && row.length == 1 && row[0] instanceof Object[] nested) {
            return nested;
        }
        return row;
    }

    static long longAt(Object[] row, int index) {
        if (row == null || index >= row.length || row[index] == null) {
            return 0L;
        }
        Object v = row[index];
        if (v instanceof Number n) {
            return n.longValue();
        }
        if (v instanceof Object[] nested) {
            return longAt(nested, 0);
        }
        return 0L;
    }

    static Instant instantAt(Object[] row, int index) {
        if (row == null || index >= row.length || row[index] == null) {
            return null;
        }
        Object v = row[index];
        if (v instanceof Instant instant) {
            return instant;
        }
        if (v instanceof java.sql.Timestamp ts) {
            return ts.toInstant();
        }
        if (v instanceof java.util.Date d) {
            return d.toInstant();
        }
        return null;
    }
}
