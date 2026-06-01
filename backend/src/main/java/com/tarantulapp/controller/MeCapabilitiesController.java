package com.tarantulapp.controller;

import com.tarantulapp.dto.MeCapabilitiesDTO;
import com.tarantulapp.service.UserCapabilitiesService;
import com.tarantulapp.util.SecurityHelper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/me")
public class MeCapabilitiesController {

    private final UserCapabilitiesService userCapabilitiesService;
    private final SecurityHelper securityHelper;

    public MeCapabilitiesController(UserCapabilitiesService userCapabilitiesService,
                                    SecurityHelper securityHelper) {
        this.userCapabilitiesService = userCapabilitiesService;
        this.securityHelper = securityHelper;
    }

    @GetMapping("/capabilities")
    public ResponseEntity<MeCapabilitiesDTO> getCapabilities() {
        UUID userId = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(userCapabilitiesService.getCapabilities(userId));
    }

    @PostMapping("/studio/activate")
    public ResponseEntity<MeCapabilitiesDTO> activateStudio() {
        UUID userId = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(userCapabilitiesService.activateStudio(userId));
    }

    /** Accept the batch-issuer terms (branded cards/passports in batch). */
    @PostMapping("/batch-issuer-terms/accept")
    public ResponseEntity<MeCapabilitiesDTO> acceptBatchTerms() {
        UUID userId = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(userCapabilitiesService.acceptBatchTerms(userId));
    }
}
