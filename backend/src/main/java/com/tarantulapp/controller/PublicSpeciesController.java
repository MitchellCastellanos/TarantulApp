package com.tarantulapp.controller;

import com.tarantulapp.dto.SpeciesSeoSnapshotDTO;
import com.tarantulapp.dto.SpeciesSitemapEntryDTO;
import com.tarantulapp.service.SpeciesPublicService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/public/species")
public class PublicSpeciesController {

    private final SpeciesPublicService speciesPublicService;

    public PublicSpeciesController(SpeciesPublicService speciesPublicService) {
        this.speciesPublicService = speciesPublicService;
    }

    @GetMapping("/{speciesIdOrSlug}/seo-snapshot")
    public ResponseEntity<SpeciesSeoSnapshotDTO> seoSnapshot(@PathVariable String speciesIdOrSlug) {
        return ResponseEntity.ok(speciesPublicService.getSeoSnapshot(speciesIdOrSlug));
    }

    @GetMapping("/sitemap-entries")
    public ResponseEntity<List<SpeciesSitemapEntryDTO>> sitemapEntries(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "500") int pageSize) {
        return ResponseEntity.ok(speciesPublicService.listSitemapEntries(page, pageSize));
    }
}
