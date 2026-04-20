package com.tarantulapp.controller;

import com.tarantulapp.service.AdminAccessService;
import com.tarantulapp.service.ModerationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class ModerationController {

    private final ModerationService moderationService;
    private final AdminAccessService adminAccessService;

    public ModerationController(ModerationService moderationService, AdminAccessService adminAccessService) {
        this.moderationService = moderationService;
        this.adminAccessService = adminAccessService;
    }

    record PublicReportRequest(@NotBlank String reason, String details) {}
    record ResolveReportRequest(@NotBlank String action, String note) {}

    @PostMapping("/public/reports/tarantula/{shortId}")
    public ResponseEntity<Map<String, String>> reportPublicTarantula(@PathVariable String shortId,
                                                                     @Valid @RequestBody PublicReportRequest req) {
        moderationService.reportPublicTarantula(shortId, req.reason(), req.details());
        return ResponseEntity.ok(Map.of("message", "ok"));
    }

    @GetMapping("/admin/reports")
    public ResponseEntity<List<Map<String, Object>>> adminReports(@RequestParam(required = false) String status) {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(moderationService.adminList(status));
    }

    @PatchMapping("/admin/reports/{id}/resolve")
    public ResponseEntity<Map<String, Object>> adminResolve(@PathVariable UUID id,
                                                            @Valid @RequestBody ResolveReportRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(moderationService.adminResolve(id, req.action(), req.note()));
    }
}
