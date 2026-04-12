package com.tarantulapp.controller;

import com.tarantulapp.dto.GbifSearchResultDTO;
import com.tarantulapp.dto.SpeciesDTO;
import com.tarantulapp.service.GbifService;
import com.tarantulapp.util.SecurityHelper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/gbif")
public class GbifController {

    private final GbifService gbifService;
    private final SecurityHelper securityHelper;

    public GbifController(GbifService gbifService, SecurityHelper securityHelper) {
        this.gbifService = gbifService;
        this.securityHelper = securityHelper;
    }

    @GetMapping("/search")
    public ResponseEntity<List<GbifSearchResultDTO>> search(@RequestParam String q) {
        return ResponseEntity.ok(gbifService.search(q));
    }

    @PostMapping("/{key}/import")
    public ResponseEntity<SpeciesDTO> importSpecies(@PathVariable Long key) {
        SpeciesDTO imported = gbifService.importSpecies(key, securityHelper.getCurrentUserId());
        return ResponseEntity.ok(imported);
    }
}
