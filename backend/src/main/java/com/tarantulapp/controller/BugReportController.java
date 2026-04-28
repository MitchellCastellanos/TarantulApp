package com.tarantulapp.controller;

import com.tarantulapp.entity.BugReport;
import com.tarantulapp.entity.User;
import com.tarantulapp.repository.BugReportRepository;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.service.EmailService;
import com.tarantulapp.util.SecurityHelper;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class BugReportController {

    private final BugReportRepository bugReportRepository;
    private final UserRepository userRepository;
    private final SecurityHelper securityHelper;
    private final EmailService emailService;

    public BugReportController(BugReportRepository bugReportRepository,
                               UserRepository userRepository,
                               SecurityHelper securityHelper,
                               EmailService emailService) {
        this.bugReportRepository = bugReportRepository;
        this.userRepository = userRepository;
        this.securityHelper = securityHelper;
        this.emailService = emailService;
    }

    record CreateBugReportRequest(
            @NotBlank String severity,
            @NotBlank String title,
            @NotBlank String description,
            String expectedBehavior,
            String currentUrl,
            String userAgent,
            String viewport,
            String appVersion,
            String screenshotUrl
    ) {}

    @PostMapping("/bug-reports")
    public ResponseEntity<Map<String, Object>> create(@Valid @RequestBody CreateBugReportRequest req) {
        UUID userId = securityHelper.getCurrentUserId();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        if (!Boolean.TRUE.equals(user.getIsBetaTester())) {
            throw new IllegalArgumentException("BETA_TESTER_REQUIRED");
        }
        BugReport report = new BugReport();
        report.setUserId(userId);
        report.setSeverity(normalizeSeverity(req.severity()));
        report.setTitle(trimTo(req.title(), 160));
        report.setDescription(trimTo(req.description(), 5000));
        report.setExpectedBehavior(trimTo(req.expectedBehavior(), 5000));
        report.setCurrentUrl(trimTo(req.currentUrl(), 500));
        report.setUserAgent(trimTo(req.userAgent(), 700));
        report.setViewport(trimTo(req.viewport(), 80));
        report.setAppVersion(trimTo(req.appVersion(), 80));
        report.setScreenshotUrl(trimTo(req.screenshotUrl(), 700));
        BugReport saved = bugReportRepository.save(report);
        emailService.sendAdminBugReportNotification(
                saved.getId(),
                user.getEmail(),
                saved.getSeverity(),
                saved.getTitle(),
                saved.getCurrentUrl(),
                saved.getAppVersion()
        );
        return ResponseEntity.ok(Map.of("id", saved.getId(), "status", saved.getStatus()));
    }

    private String normalizeSeverity(String raw) {
        String value = raw == null ? "" : raw.trim().toLowerCase();
        if ("critical".equals(value) || "high".equals(value) || "medium".equals(value) || "low".equals(value)) {
            return value;
        }
        return "medium";
    }

    private String trimTo(String value, int max) {
        if (value == null) return null;
        String out = value.trim();
        if (out.isEmpty()) return null;
        return out.length() <= max ? out : out.substring(0, max);
    }
}
