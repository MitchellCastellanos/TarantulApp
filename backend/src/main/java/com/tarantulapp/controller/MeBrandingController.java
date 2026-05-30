package com.tarantulapp.controller;

import com.tarantulapp.service.BrandingService;
import com.tarantulapp.util.SecurityHelper;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

/** Self-serve brand logo management for non-individual accounts. */
@RestController
@RequestMapping("/api/me/branding")
public class MeBrandingController {

    private final BrandingService brandingService;
    private final SecurityHelper securityHelper;

    public MeBrandingController(BrandingService brandingService, SecurityHelper securityHelper) {
        this.brandingService = brandingService;
        this.securityHelper = securityHelper;
    }

    record BrandingPreferencesRequest(Boolean useBwOnLabels) {}

    @GetMapping
    public ResponseEntity<Map<String, Object>> myBranding() {
        return ResponseEntity.ok(brandingService.myBranding(securityHelper.getCurrentUserId()));
    }

    @PostMapping(value = "/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadLogo(@RequestParam("file") MultipartFile file) throws IOException {
        UUID userId = securityHelper.getCurrentUserId();
        try {
            return ResponseEntity.ok(brandingService.uploadLogo(userId, file, false));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping
    public ResponseEntity<Map<String, Object>> updatePreferences(@RequestBody BrandingPreferencesRequest req) {
        return ResponseEntity.ok(brandingService.updatePreferences(
                securityHelper.getCurrentUserId(), req == null ? null : req.useBwOnLabels()));
    }

    @DeleteMapping("/logo")
    public ResponseEntity<Map<String, Object>> deleteLogo() {
        return ResponseEntity.ok(brandingService.deleteLogo(securityHelper.getCurrentUserId()));
    }
}
