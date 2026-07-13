package com.tarantulapp.controller;

import com.tarantulapp.dto.AdminIssuerLabelsDTO;
import com.tarantulapp.dto.AdminLabelRowDTO;
import com.tarantulapp.dto.PassportClaimControlResponse;
import com.tarantulapp.service.AdminAccessService;
import com.tarantulapp.service.AdminLabelsService;
import com.tarantulapp.service.PassportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Admin overview of labels issued per user, with verified-origin flag and claim traffic-light status. */
@RestController
@RequestMapping("/api/admin/labels")
public class AdminLabelsController {

    private final AdminAccessService adminAccessService;
    private final AdminLabelsService adminLabelsService;
    private final PassportService passportService;

    public AdminLabelsController(AdminAccessService adminAccessService,
                                 AdminLabelsService adminLabelsService,
                                 PassportService passportService) {
        this.adminAccessService = adminAccessService;
        this.adminLabelsService = adminLabelsService;
        this.passportService = passportService;
    }

    @GetMapping("/issuers")
    public ResponseEntity<List<AdminIssuerLabelsDTO>> issuers() {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(adminLabelsService.listIssuers());
    }

    @GetMapping("/issuers/{userId}/passports")
    public ResponseEntity<List<AdminLabelRowDTO>> passports(@PathVariable UUID userId) {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(adminLabelsService.passportsForIssuer(userId));
    }

    /** Admin control per label without assigning it: freeze (ON_SHELF), release (CLAIMABLE) or VOID. */
    @PatchMapping("/passports/{passportId}/claim-status")
    public ResponseEntity<PassportClaimControlResponse> setClaimStatus(@PathVariable UUID passportId,
                                                                       @RequestBody Map<String, String> body) {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(passportService.adminSetClaimStatus(passportId, body.get("status")));
    }
}
