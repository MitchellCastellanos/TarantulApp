package com.tarantulapp.controller;

import com.tarantulapp.dto.CreateInventoryBatchRequest;
import com.tarantulapp.dto.GenerateBatchPassportsRequest;
import com.tarantulapp.dto.GenerateBatchPassportsResponse;
import com.tarantulapp.dto.InventoryBatchAdjustmentRequest;
import com.tarantulapp.dto.InventoryBatchResponse;
import com.tarantulapp.dto.StudioPassportSummaryDTO;
import com.tarantulapp.service.InventoryBatchService;
import com.tarantulapp.util.SecurityHelper;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/studio")
public class StudioController {

    private final InventoryBatchService inventoryBatchService;
    private final SecurityHelper securityHelper;

    public StudioController(InventoryBatchService inventoryBatchService, SecurityHelper securityHelper) {
        this.inventoryBatchService = inventoryBatchService;
        this.securityHelper = securityHelper;
    }

    @GetMapping("/batches")
    public ResponseEntity<List<InventoryBatchResponse>> listBatches() {
        UUID userId = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(inventoryBatchService.listForUser(userId));
    }

    @PostMapping("/batches")
    public ResponseEntity<InventoryBatchResponse> createBatch(@Valid @RequestBody CreateInventoryBatchRequest req) {
        UUID userId = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(inventoryBatchService.create(req, userId));
    }

    @GetMapping("/batches/{batchId}")
    public ResponseEntity<InventoryBatchResponse> getBatch(@PathVariable UUID batchId) {
        UUID userId = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(inventoryBatchService.getForUser(batchId, userId));
    }

    @PostMapping("/batches/{batchId}/adjustments")
    public ResponseEntity<InventoryBatchResponse> adjustBatch(@PathVariable UUID batchId,
                                                            @RequestBody InventoryBatchAdjustmentRequest req) {
        UUID userId = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(inventoryBatchService.adjust(batchId, userId, req));
    }

    @PostMapping("/batches/{batchId}/passports")
    public ResponseEntity<GenerateBatchPassportsResponse> generatePassports(
            @PathVariable UUID batchId,
            @Valid @RequestBody GenerateBatchPassportsRequest req) {
        UUID userId = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(inventoryBatchService.generatePassports(batchId, userId, req));
    }

    @GetMapping("/batches/{batchId}/passports")
    public ResponseEntity<List<StudioPassportSummaryDTO>> listPassports(@PathVariable UUID batchId) {
        UUID userId = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(inventoryBatchService.listPassportsForBatch(batchId, userId));
    }
}
