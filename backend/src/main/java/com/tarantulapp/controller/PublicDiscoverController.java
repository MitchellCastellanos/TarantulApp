package com.tarantulapp.controller;

import com.tarantulapp.dto.DiscoverLocalSpeciesViewDTO;
import com.tarantulapp.dto.DiscoverSearchHitDTO;
import com.tarantulapp.dto.DiscoverTaxonDetailDTO;
import com.tarantulapp.dto.SpeciesDTO;
import com.tarantulapp.service.DiscoverAggregationService;
import com.tarantulapp.service.DiscoverCatalogService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/public/discover")
public class PublicDiscoverController {

    private static final int MAX_SEARCH_LEN = 120;

    private final DiscoverAggregationService discoverAggregationService;
    private final DiscoverCatalogService discoverCatalogService;

    public PublicDiscoverController(DiscoverAggregationService discoverAggregationService,
                                    DiscoverCatalogService discoverCatalogService) {
        this.discoverAggregationService = discoverAggregationService;
        this.discoverCatalogService = discoverCatalogService;
    }

    @GetMapping("/search")
    public ResponseEntity<List<DiscoverSearchHitDTO>> search(@RequestParam(required = false) String q) {
        if (q == null || q.isBlank()) {
            return ResponseEntity.ok(List.of());
        }
        String trimmed = q.length() > MAX_SEARCH_LEN ? q.substring(0, MAX_SEARCH_LEN) : q;
        return ResponseEntity.ok(discoverAggregationService.search(trimmed));
    }

    @GetMapping("/taxon")
    public ResponseEntity<DiscoverTaxonDetailDTO> taxon(@RequestParam Long gbifKey) {
        return discoverAggregationService.buildTaxonDetail(gbifKey)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/species")
    public ResponseEntity<Page<SpeciesDTO>> listSpecies(
            @RequestParam(required = false) String experienceLevel,
            @RequestParam(required = false) String habitatType,
            @RequestParam(required = false) String growthRate,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) BigDecimal sizeMin,
            @RequestParam(required = false) BigDecimal sizeMax,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(name = "pageSize", defaultValue = "24") int pageSize,
            @RequestParam(defaultValue = "scientificName") String sort,
            @RequestParam(defaultValue = "asc") String direction) {
        int p = Math.max(0, page);
        int s = Math.min(Math.max(pageSize, 1), 60);
        Sort.Direction dir = "desc".equalsIgnoreCase(direction) ? Sort.Direction.DESC : Sort.Direction.ASC;
        String sortField = switch (sort) {
            case "commonName" -> "commonName";
            case "experienceLevel" -> "experienceLevel";
            case "habitatType" -> "habitatType";
            default -> "scientificName";
        };
        PageRequest pr = PageRequest.of(p, s, Sort.by(dir, sortField));
        return ResponseEntity.ok(discoverCatalogService.findCatalogPage(
                experienceLevel, habitatType, growthRate, q, sizeMin, sizeMax, pr));
    }

    @GetMapping("/species/{id}")
    public ResponseEntity<DiscoverLocalSpeciesViewDTO> speciesById(@PathVariable int id) {
        return discoverCatalogService.findPublicCatalogViewById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
