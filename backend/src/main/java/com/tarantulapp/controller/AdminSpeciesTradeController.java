package com.tarantulapp.controller;

import com.tarantulapp.service.AdminAccessService;
import com.tarantulapp.service.SpeciesTradeNoteService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/species-trade-notes")
public class AdminSpeciesTradeController {

    record UpsertTradeNoteRequest(
            @NotNull Integer speciesId,
            @NotBlank String country,
            String citesAppendix,
            String laceyStatus,
            String notesMd
    ) {}

    private final SpeciesTradeNoteService speciesTradeNoteService;
    private final AdminAccessService adminAccessService;

    public AdminSpeciesTradeController(SpeciesTradeNoteService speciesTradeNoteService,
                                       AdminAccessService adminAccessService) {
        this.speciesTradeNoteService = speciesTradeNoteService;
        this.adminAccessService = adminAccessService;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listAll() {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(speciesTradeNoteService.listAllForAdmin());
    }

    @PutMapping
    public ResponseEntity<Map<String, Object>> upsert(@RequestBody UpsertTradeNoteRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(speciesTradeNoteService.upsert(
                req.speciesId(),
                req.country(),
                req.citesAppendix(),
                req.laceyStatus(),
                req.notesMd()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        adminAccessService.assertCurrentUserIsAdmin();
        speciesTradeNoteService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
