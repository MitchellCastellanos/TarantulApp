package com.tarantulapp.controller;

import com.tarantulapp.service.SpeciesWatchService;
import com.tarantulapp.util.SecurityHelper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/me/species-watches")
public class SpeciesWatchController {

    private final SpeciesWatchService speciesWatchService;
    private final SecurityHelper securityHelper;

    public SpeciesWatchController(SpeciesWatchService speciesWatchService, SecurityHelper securityHelper) {
        this.speciesWatchService = speciesWatchService;
        this.securityHelper = securityHelper;
    }

    record WatchRequest(@NotNull Integer speciesId) {}

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listMine() {
        return ResponseEntity.ok(speciesWatchService.listMine(securityHelper.getCurrentUserId()));
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status(@RequestParam("speciesId") Integer speciesId) {
        boolean watched = speciesWatchService.isWatched(securityHelper.getCurrentUserId(), speciesId);
        return ResponseEntity.ok(Map.of("watched", watched));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> watch(@Valid @RequestBody WatchRequest req) {
        return ResponseEntity.ok(speciesWatchService.watch(securityHelper.getCurrentUserId(), req.speciesId()));
    }

    @DeleteMapping("/{speciesId}")
    public ResponseEntity<Map<String, Object>> unwatch(@PathVariable Integer speciesId) {
        speciesWatchService.unwatch(securityHelper.getCurrentUserId(), speciesId);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
