package com.tarantulapp.controller;

import com.tarantulapp.service.OfficialVendorService;
import com.tarantulapp.util.SecurityHelper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/me/partner")
public class MePartnerController {

    private final OfficialVendorService officialVendorService;
    private final SecurityHelper securityHelper;

    public MePartnerController(OfficialVendorService officialVendorService, SecurityHelper securityHelper) {
        this.officialVendorService = officialVendorService;
        this.securityHelper = securityHelper;
    }

    @GetMapping("/hub")
    public ResponseEntity<Map<String, Object>> partnerHub() {
        UUID userId = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(officialVendorService.mePartnerHub(userId));
    }

    record CheckoutModeRequest(String mode) {}

    /** Partner self-service: choose whether checkout happens on their website or in the TarantulApp cart. */
    @PutMapping("/checkout-mode")
    public ResponseEntity<Map<String, Object>> setCheckoutMode(@RequestBody CheckoutModeRequest req) {
        UUID userId = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(officialVendorService.mePartnerSetCheckoutMode(
                userId, req == null ? null : req.mode()));
    }
}
