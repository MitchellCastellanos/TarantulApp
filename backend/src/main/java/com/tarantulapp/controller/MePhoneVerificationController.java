package com.tarantulapp.controller;

import com.tarantulapp.service.PhoneVerificationService;
import com.tarantulapp.util.SecurityHelper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

/**
 * Phone ownership verification for the current user. Required before issuing branded labels in batch
 * (or anything other than a P2P transfer). Backed by Twilio Verify.
 */
@RestController
@RequestMapping("/api/me/phone")
public class MePhoneVerificationController {

    private final PhoneVerificationService phoneVerificationService;
    private final SecurityHelper securityHelper;

    public MePhoneVerificationController(PhoneVerificationService phoneVerificationService,
                                         SecurityHelper securityHelper) {
        this.phoneVerificationService = phoneVerificationService;
        this.securityHelper = securityHelper;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> status() {
        UUID userId = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(phoneVerificationService.status(userId));
    }

    @PostMapping("/verify/start")
    public ResponseEntity<Map<String, Object>> start(@RequestBody PhoneStartRequest req) {
        UUID userId = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(phoneVerificationService.start(userId, req == null ? null : req.phone()));
    }

    @PostMapping("/verify/check")
    public ResponseEntity<Map<String, Object>> check(@RequestBody PhoneCheckRequest req) {
        UUID userId = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(phoneVerificationService.check(userId, req == null ? null : req.code()));
    }

    public record PhoneStartRequest(String phone) {}

    public record PhoneCheckRequest(String code) {}
}
