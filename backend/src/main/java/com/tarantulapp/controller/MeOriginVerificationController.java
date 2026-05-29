package com.tarantulapp.controller;

import com.tarantulapp.service.VerifiedOriginService;
import com.tarantulapp.util.SecurityHelper;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/me/origin-verification")
public class MeOriginVerificationController {

    private final VerifiedOriginService verifiedOriginService;
    private final SecurityHelper securityHelper;

    public MeOriginVerificationController(VerifiedOriginService verifiedOriginService,
                                          SecurityHelper securityHelper) {
        this.verifiedOriginService = verifiedOriginService;
        this.securityHelper = securityHelper;
    }

    record SubmitOriginVerificationRequest(
            @NotBlank String kind,
            @NotBlank String note,
            String evidenceUrl
    ) {}

    @GetMapping
    public ResponseEntity<Map<String, Object>> myStatus() {
        UUID userId = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(verifiedOriginService.myStatus(userId));
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> submit(@RequestBody SubmitOriginVerificationRequest req) {
        UUID userId = securityHelper.getCurrentUserId();
        try {
            return ResponseEntity.ok(verifiedOriginService.submit(
                    userId, req.kind(), req.note(), req.evidenceUrl()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
