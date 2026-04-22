package com.tarantulapp.controller;

import com.tarantulapp.service.SexIdCaseService;
import com.tarantulapp.util.SecurityHelper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/public/sex-id-cases")
public class PublicSexIdCaseController {

    private final SexIdCaseService sexIdCaseService;
    private final SecurityHelper securityHelper;

    public PublicSexIdCaseController(SexIdCaseService sexIdCaseService, SecurityHelper securityHelper) {
        this.sexIdCaseService = sexIdCaseService;
        this.securityHelper = securityHelper;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(sexIdCaseService.publicList(page, size));
    }

    @GetMapping("/{caseId}")
    public ResponseEntity<Map<String, Object>> get(
            @PathVariable UUID caseId) {
        Optional<UUID> viewer = securityHelper.tryGetCurrentUserId();
        return ResponseEntity.ok(sexIdCaseService.getPublicCase(caseId, viewer));
    }
}
