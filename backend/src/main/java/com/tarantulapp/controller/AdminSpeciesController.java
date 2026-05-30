package com.tarantulapp.controller;

import com.tarantulapp.service.AdminAccessService;
import com.tarantulapp.service.SpeciesAdminService;
import com.tarantulapp.service.SpeciesGapService;
import com.tarantulapp.util.SecurityHelper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Admin: manual species creation and taxonomy gap (missing-species alert) management. */
@RestController
@RequestMapping("/api/admin/species")
public class AdminSpeciesController {

    private final SpeciesAdminService speciesAdminService;
    private final SpeciesGapService speciesGapService;
    private final AdminAccessService adminAccessService;
    private final SecurityHelper securityHelper;

    public AdminSpeciesController(SpeciesAdminService speciesAdminService,
                                  SpeciesGapService speciesGapService,
                                  AdminAccessService adminAccessService,
                                  SecurityHelper securityHelper) {
        this.speciesAdminService = speciesAdminService;
        this.speciesGapService = speciesGapService;
        this.adminAccessService = adminAccessService;
        this.securityHelper = securityHelper;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody SpeciesAdminService.CreateSpeciesRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        try {
            return ResponseEntity.ok(speciesAdminService.create(req, securityHelper.getCurrentUserId()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/gaps")
    public ResponseEntity<Map<String, Object>> gaps() {
        adminAccessService.assertCurrentUserIsAdmin();
        List<Map<String, Object>> open = speciesGapService.listOpen();
        return ResponseEntity.ok(Map.of("open", open, "openCount", open.size()));
    }

    @PostMapping("/gaps/{id}/dismiss")
    public ResponseEntity<Map<String, Object>> dismiss(@PathVariable UUID id) {
        adminAccessService.assertCurrentUserIsAdmin();
        speciesGapService.dismiss(id);
        return ResponseEntity.ok(Map.of("status", "dismissed"));
    }
}
