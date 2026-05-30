package com.tarantulapp.controller;

import com.tarantulapp.service.SpecimenTransferService;
import com.tarantulapp.util.SecurityHelper;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Email-based specimen custody transfers initiated and accepted by keepers. */
@RestController
@RequestMapping("/api/me/transfers")
public class MeTransfersController {

    private final SpecimenTransferService transferService;
    private final SecurityHelper securityHelper;

    public MeTransfersController(SpecimenTransferService transferService, SecurityHelper securityHelper) {
        this.transferService = transferService;
        this.securityHelper = securityHelper;
    }

    record InitiateTransferRequest(@NotNull UUID tarantulaId, @NotBlank String toEmail, String message) {}

    @PostMapping
    public ResponseEntity<Map<String, Object>> initiate(@RequestBody InitiateTransferRequest req) {
        UUID userId = securityHelper.getCurrentUserId();
        try {
            return ResponseEntity.ok(transferService.initiate(req.tarantulaId(), userId, req.toEmail(), req.message()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/incoming")
    public ResponseEntity<List<Map<String, Object>>> incoming() {
        return ResponseEntity.ok(transferService.incoming(securityHelper.getCurrentUserId()));
    }

    @GetMapping("/outgoing")
    public ResponseEntity<List<Map<String, Object>>> outgoing() {
        return ResponseEntity.ok(transferService.outgoing(securityHelper.getCurrentUserId()));
    }

    @PostMapping("/{id}/accept")
    public ResponseEntity<Map<String, Object>> accept(@PathVariable UUID id) {
        UUID userId = securityHelper.getCurrentUserId();
        try {
            return ResponseEntity.ok(transferService.accept(id, userId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<Map<String, Object>> cancel(@PathVariable UUID id) {
        UUID userId = securityHelper.getCurrentUserId();
        try {
            return ResponseEntity.ok(transferService.cancel(id, userId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
