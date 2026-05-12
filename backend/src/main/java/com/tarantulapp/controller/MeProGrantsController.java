package com.tarantulapp.controller;

import com.tarantulapp.service.ProDayGrantService;
import com.tarantulapp.util.SecurityHelper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/me/pro-grants")
public class MeProGrantsController {

    private final ProDayGrantService proDayGrantService;
    private final SecurityHelper securityHelper;

    public MeProGrantsController(ProDayGrantService proDayGrantService, SecurityHelper securityHelper) {
        this.proDayGrantService = proDayGrantService;
        this.securityHelper = securityHelper;
    }

    /**
     * Powers the "Tus días Pro" gamification card on ProPage. Returns the user's current trial-end
     * datetime, total free days remaining, and a chronological breakdown of every grant by source
     * (referral / admin / migration). The "how to earn more" copy is rendered client-side from i18n
     * since it stays in sync with the app's localization stack rather than the email bundles.
     */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> summary() {
        UUID userId = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(proDayGrantService.summaryForUser(userId));
    }
}
