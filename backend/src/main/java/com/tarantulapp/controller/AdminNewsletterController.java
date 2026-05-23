package com.tarantulapp.controller;

import com.tarantulapp.service.AdminAccessService;
import com.tarantulapp.service.NewsletterService;
import com.tarantulapp.util.SecurityHelper;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/marketing/newsletter")
public class AdminNewsletterController {

    record NewsletterDraftRequest(@NotBlank String title, List<UUID> listingIds) {}

    private final NewsletterService newsletterService;
    private final AdminAccessService adminAccessService;
    private final SecurityHelper securityHelper;

    public AdminNewsletterController(NewsletterService newsletterService,
                                     AdminAccessService adminAccessService,
                                     SecurityHelper securityHelper) {
        this.newsletterService = newsletterService;
        this.adminAccessService = adminAccessService;
        this.securityHelper = securityHelper;
    }

    @GetMapping("/subscribers/count")
    public ResponseEntity<Map<String, Object>> subscriberCount() {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(Map.of("count", newsletterService.countActiveSubscribers()));
    }

    @PostMapping("/drafts")
    public ResponseEntity<Map<String, Object>> createDraft(@RequestBody NewsletterDraftRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        UUID adminId = securityHelper.getCurrentUserId();
        return ResponseEntity.ok(newsletterService.saveDraft(adminId, req.title(), req.listingIds()));
    }

    @GetMapping("/drafts/{id}")
    public ResponseEntity<Map<String, Object>> previewDraft(@PathVariable UUID id) {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(newsletterService.previewDraft(id));
    }

    @PostMapping("/drafts/{id}/send")
    public ResponseEntity<Map<String, Object>> sendDraft(@PathVariable UUID id) {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(newsletterService.sendDraft(id));
    }
}
