package com.tarantulapp.controller;

import com.tarantulapp.service.NewsletterService;
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
@RequestMapping("/api/me")
public class MeNewsletterController {

    record NewsletterSubscriptionRequest(Boolean subscribed) {}

    private final NewsletterService newsletterService;
    private final SecurityHelper securityHelper;

    public MeNewsletterController(NewsletterService newsletterService, SecurityHelper securityHelper) {
        this.newsletterService = newsletterService;
        this.securityHelper = securityHelper;
    }

    @GetMapping("/newsletter-subscription")
    public ResponseEntity<Map<String, Object>> getSubscription() {
        UUID userId = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(Map.of("subscribed", newsletterService.isSubscribed(userId)));
    }

    @PutMapping("/newsletter-subscription")
    public ResponseEntity<Map<String, Object>> setSubscription(@RequestBody NewsletterSubscriptionRequest req) {
        UUID userId = securityHelper.getCurrentUserId();
        boolean subscribed = req != null && Boolean.TRUE.equals(req.subscribed());
        return ResponseEntity.ok(newsletterService.setSubscription(userId, subscribed));
    }
}
