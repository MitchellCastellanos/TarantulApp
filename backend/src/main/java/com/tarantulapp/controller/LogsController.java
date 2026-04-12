package com.tarantulapp.controller;

import com.tarantulapp.dto.*;
import com.tarantulapp.service.LogsService;
import com.tarantulapp.util.SecurityHelper;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class LogsController {

    private final LogsService logsService;
    private final SecurityHelper securityHelper;

    public LogsController(LogsService logsService, SecurityHelper securityHelper) {
        this.logsService = logsService;
        this.securityHelper = securityHelper;
    }

    // ─── Feeding ────────────────────────────────────────────────────────────

    @PostMapping("/tarantulas/{tId}/feedings")
    public ResponseEntity<FeedingLogResponse> addFeeding(@PathVariable UUID tId,
                                                          @Valid @RequestBody FeedingLogRequest req) {
        return ResponseEntity.ok(logsService.addFeeding(tId, req, securityHelper.getCurrentUserId()));
    }

    @GetMapping("/tarantulas/{tId}/feedings")
    public ResponseEntity<List<FeedingLogResponse>> getFeedings(@PathVariable UUID tId) {
        return ResponseEntity.ok(logsService.getFeedings(tId, securityHelper.getCurrentUserId()));
    }

    @DeleteMapping("/feedings/{id}")
    public ResponseEntity<Void> deleteFeeding(@PathVariable UUID id) {
        logsService.deleteFeeding(id, securityHelper.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }

    // ─── Molt ───────────────────────────────────────────────────────────────

    @PostMapping("/tarantulas/{tId}/molts")
    public ResponseEntity<MoltLogResponse> addMolt(@PathVariable UUID tId,
                                                    @Valid @RequestBody MoltLogRequest req) {
        return ResponseEntity.ok(logsService.addMolt(tId, req, securityHelper.getCurrentUserId()));
    }

    @GetMapping("/tarantulas/{tId}/molts")
    public ResponseEntity<List<MoltLogResponse>> getMolts(@PathVariable UUID tId) {
        return ResponseEntity.ok(logsService.getMolts(tId, securityHelper.getCurrentUserId()));
    }

    @DeleteMapping("/molts/{id}")
    public ResponseEntity<Void> deleteMolt(@PathVariable UUID id) {
        logsService.deleteMolt(id, securityHelper.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }

    // ─── Behavior ───────────────────────────────────────────────────────────

    @PostMapping("/tarantulas/{tId}/behaviors")
    public ResponseEntity<BehaviorLogResponse> addBehavior(@PathVariable UUID tId,
                                                             @Valid @RequestBody BehaviorLogRequest req) {
        return ResponseEntity.ok(logsService.addBehavior(tId, req, securityHelper.getCurrentUserId()));
    }

    @GetMapping("/tarantulas/{tId}/behaviors")
    public ResponseEntity<List<BehaviorLogResponse>> getBehaviors(@PathVariable UUID tId) {
        return ResponseEntity.ok(logsService.getBehaviors(tId, securityHelper.getCurrentUserId()));
    }

    @DeleteMapping("/behaviors/{id}")
    public ResponseEntity<Void> deleteBehavior(@PathVariable UUID id) {
        logsService.deleteBehavior(id, securityHelper.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }
}
