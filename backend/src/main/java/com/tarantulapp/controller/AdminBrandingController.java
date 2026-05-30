package com.tarantulapp.controller;

import com.tarantulapp.service.AdminAccessService;
import com.tarantulapp.service.BrandingService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

/** Admin uploads/manages a brand logo on behalf of an account (mostly official partners). */
@RestController
@RequestMapping("/api/admin/users/{id}/branding")
public class AdminBrandingController {

    private final BrandingService brandingService;
    private final AdminAccessService adminAccessService;

    public AdminBrandingController(BrandingService brandingService, AdminAccessService adminAccessService) {
        this.brandingService = brandingService;
        this.adminAccessService = adminAccessService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> branding(@PathVariable UUID id) {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(brandingService.myBranding(id));
    }

    @PostMapping(value = "/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadLogo(@PathVariable UUID id,
                                                          @RequestParam("file") MultipartFile file) throws IOException {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(brandingService.uploadLogo(id, file, true));
    }

    @DeleteMapping("/logo")
    public ResponseEntity<Map<String, Object>> deleteLogo(@PathVariable UUID id) {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(brandingService.deleteLogo(id));
    }
}
