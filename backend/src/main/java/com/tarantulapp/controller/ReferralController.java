package com.tarantulapp.controller;

import com.tarantulapp.service.ReferralService;
import com.tarantulapp.util.SecurityHelper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/referrals")
public class ReferralController {

    private final ReferralService referralService;
    private final SecurityHelper securityHelper;

    public ReferralController(ReferralService referralService, SecurityHelper securityHelper) {
        this.referralService = referralService;
        this.securityHelper = securityHelper;
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me() {
        UUID uid = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(referralService.getOrCreateReferralSummary(uid));
    }
}
