package com.tarantulapp.controller;

import com.tarantulapp.entity.User;
import com.tarantulapp.entity.BugReport;
import com.tarantulapp.entity.BetaApplication;
import com.tarantulapp.repository.BetaApplicationRepository;
import com.tarantulapp.repository.BugReportRepository;
import com.tarantulapp.repository.ReminderRepository;
import com.tarantulapp.repository.TarantulaRepository;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.service.AdminAccessService;
import com.tarantulapp.service.AuthService;
import com.tarantulapp.service.OfficialVendorService;
import com.tarantulapp.service.TaxonomyDiscoveryService;
import com.tarantulapp.service.TaxonomySyncService;
import com.tarantulapp.service.vendors.sync.PartnerListingSyncService;
import com.tarantulapp.entity.PartnerListingSyncRun;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.LinkedHashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminAccessService adminAccessService;
    private final UserRepository userRepository;
    private final TarantulaRepository tarantulaRepository;
    private final ReminderRepository reminderRepository;
    private final OfficialVendorService officialVendorService;
    private final PartnerListingSyncService partnerListingSyncService;
    private final TaxonomySyncService taxonomySyncService;
    private final TaxonomyDiscoveryService taxonomyDiscoveryService;
    private final BugReportRepository bugReportRepository;
    private final BetaApplicationRepository betaApplicationRepository;
    private final AuthService authService;

    public AdminController(AdminAccessService adminAccessService,
                           UserRepository userRepository,
                           TarantulaRepository tarantulaRepository,
                           ReminderRepository reminderRepository,
                           OfficialVendorService officialVendorService,
                           PartnerListingSyncService partnerListingSyncService,
                           TaxonomySyncService taxonomySyncService,
                           TaxonomyDiscoveryService taxonomyDiscoveryService,
                           BugReportRepository bugReportRepository,
                           BetaApplicationRepository betaApplicationRepository,
                           AuthService authService) {
        this.adminAccessService = adminAccessService;
        this.userRepository = userRepository;
        this.tarantulaRepository = tarantulaRepository;
        this.reminderRepository = reminderRepository;
        this.officialVendorService = officialVendorService;
        this.partnerListingSyncService = partnerListingSyncService;
        this.taxonomySyncService = taxonomySyncService;
        this.taxonomyDiscoveryService = taxonomyDiscoveryService;
        this.bugReportRepository = bugReportRepository;
        this.betaApplicationRepository = betaApplicationRepository;
        this.authService = authService;
    }

    record SetOfficialVendorStatusRequest(Boolean enabled) {}

    record UpdateOfficialVendorStrategicRequest(Boolean strategicFounder, Boolean listingImportEnabled) {}
    record ResolveBugReportRequest(String status, String note) {}
    record SetBetaTesterRequest(Boolean isBetaTester, String cohort, String country, String experienceLevel) {}
    /** {@code generatePassword}: when {@code null} or true, a password is generated on approve (default). */
    record ReviewBetaApplicationRequest(String action, UUID userId, String note, Boolean generatePassword) {}
    record AdminSetUserPasswordRequest(String newPassword, Boolean generatePassword) {}
    record AdminProvisionTesterRequest(String identifier, String newPassword, Boolean generatePassword, String displayName) {}

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> summary() {
        adminAccessService.assertCurrentUserIsAdmin();
        long usersTotal = userRepository.count();
        long usersLast7d = userRepository.countByCreatedAtAfter(LocalDateTime.now().minusDays(7));
        long tarantulasTotal = tarantulaRepository.count();
        long remindersPending = reminderRepository.countByIsDoneFalse();
        return ResponseEntity.ok(Map.of(
                "usersTotal", usersTotal,
                "usersLast7d", usersLast7d,
                "tarantulasTotal", tarantulasTotal,
                "remindersPending", remindersPending
        ));
    }

    @GetMapping("/recent-users")
    public ResponseEntity<List<Map<String, Object>>> recentUsers() {
        adminAccessService.assertCurrentUserIsAdmin();
        List<Map<String, Object>> out = userRepository.findTop10ByOrderByCreatedAtDesc().stream()
                .map(this::mapUser)
                .collect(Collectors.toList());
        return ResponseEntity.ok(out);
    }

    @GetMapping("/official-vendors")
    public ResponseEntity<List<Map<String, Object>>> officialVendors() {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(officialVendorService.adminListVendors());
    }

    @GetMapping("/official-vendor-leads")
    public ResponseEntity<List<Map<String, Object>>> officialVendorLeads() {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(officialVendorService.adminListLeads());
    }

    @PatchMapping("/official-vendors/{id}/status")
    public ResponseEntity<Map<String, Object>> setOfficialVendorStatus(@PathVariable String id,
                                                                       @Valid @RequestBody SetOfficialVendorStatusRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        boolean enabled = req.enabled() == null || req.enabled();
        return ResponseEntity.ok(officialVendorService.adminSetVendorEnabled(java.util.UUID.fromString(id), enabled));
    }

    @PatchMapping("/official-vendors/{id}/strategic-program")
    public ResponseEntity<Map<String, Object>> updateOfficialVendorStrategicProgram(@PathVariable UUID id,
                                                                                   @Valid @RequestBody UpdateOfficialVendorStrategicRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        if (req.strategicFounder() == null && req.listingImportEnabled() == null) {
            throw new IllegalArgumentException("strategicFounder o listingImportEnabled requerido");
        }
        return ResponseEntity.ok(officialVendorService.adminUpdateStrategicProgram(
                id, req.strategicFounder(), req.listingImportEnabled()));
    }

    @PostMapping("/partner-sync/run")
    public ResponseEntity<List<Map<String, Object>>> runPartnerSyncNow() {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(
                partnerListingSyncService.runManualSyncAllStrategic()
                        .stream()
                        .map(this::mapPartnerSyncRun)
                        .collect(Collectors.toList())
        );
    }

    @PostMapping("/taxonomy-sync/run")
    public ResponseEntity<Map<String, Object>> runTaxonomySyncNow() {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(taxonomySyncService.runNow());
    }

    /** Kicks off whitelist discovery on a background thread; returns immediately. */
    @PostMapping("/taxonomy-discovery/whitelist/run")
    public ResponseEntity<Map<String, Object>> runDiscoveryWhitelistNow() {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.accepted().body(taxonomyDiscoveryService.runWhitelistAsync());
    }

    /** Kicks off family-wide discovery on a background thread; returns immediately. */
    @PostMapping("/taxonomy-discovery/family-wide/run")
    public ResponseEntity<Map<String, Object>> runDiscoveryFamilyWideNow() {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.accepted().body(taxonomyDiscoveryService.runFamilyWideAsync());
    }

    @GetMapping("/partner-sync/runs")
    public ResponseEntity<List<Map<String, Object>>> partnerSyncRuns(@RequestParam(required = false) UUID vendorId) {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(
                partnerListingSyncService.recentRuns(vendorId)
                        .stream()
                        .map(this::mapPartnerSyncRun)
                        .collect(Collectors.toList())
        );
    }

    @GetMapping("/bug-reports")
    public ResponseEntity<List<Map<String, Object>>> bugReports(@RequestParam(required = false) String status) {
        adminAccessService.assertCurrentUserIsAdmin();
        List<BugReport> items = (status == null || status.isBlank())
                ? bugReportRepository.findAllByOrderByCreatedAtDesc()
                : bugReportRepository.findByStatusOrderByCreatedAtDesc(status.trim().toLowerCase());
        return ResponseEntity.ok(items.stream().map(this::mapBugReport).collect(Collectors.toList()));
    }

    @PatchMapping("/bug-reports/{id}")
    public ResponseEntity<Map<String, Object>> resolveBugReport(@PathVariable UUID id,
                                                                @Valid @RequestBody ResolveBugReportRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        BugReport report = bugReportRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("BUG_REPORT_NOT_FOUND"));
        String nextStatus = req.status() == null ? "" : req.status().trim().toLowerCase();
        if (!List.of("open", "in_progress", "fixed", "wont_fix").contains(nextStatus)) {
            throw new IllegalArgumentException("INVALID_BUG_REPORT_STATUS");
        }
        report.setStatus(nextStatus);
        report.setResolutionNote(req.note() == null ? null : req.note().trim());
        report.setResolvedAt(("fixed".equals(nextStatus) || "wont_fix".equals(nextStatus)) ? LocalDateTime.now() : null);
        bugReportRepository.save(report);
        return ResponseEntity.ok(mapBugReport(report));
    }

    @GetMapping("/beta-testers")
    public ResponseEntity<List<Map<String, Object>>> betaTesters() {
        adminAccessService.assertCurrentUserIsAdmin();
        List<User> users = userRepository.findByIsBetaTesterTrueOrderByCreatedAtDesc();
        return ResponseEntity.ok(users.stream().map(this::mapBetaTester).collect(Collectors.toList()));
    }

    @PatchMapping("/users/{id}/beta")
    public ResponseEntity<Map<String, Object>> setUserBeta(@PathVariable UUID id,
                                                           @Valid @RequestBody SetBetaTesterRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        User user = userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        if (req.isBetaTester() != null) {
            user.setIsBetaTester(req.isBetaTester());
        }
        if (req.cohort() != null) user.setBetaCohort(trim(req.cohort(), 80));
        if (req.country() != null) user.setBetaCountry(trim(req.country(), 80));
        if (req.experienceLevel() != null) user.setBetaExperienceLevel(trim(req.experienceLevel(), 40));
        userRepository.save(user);
        return ResponseEntity.ok(mapBetaTester(user));
    }

    @PostMapping("/users/{id}/password")
    public ResponseEntity<Map<String, Object>> adminSetUserPassword(@PathVariable UUID id,
                                                                    @RequestBody AdminSetUserPasswordRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        boolean gen = Boolean.TRUE.equals(req.generatePassword());
        if (!gen && (req.newPassword() == null || req.newPassword().isBlank())) {
            throw new IllegalArgumentException("NEW_PASSWORD_OR_GENERATE_REQUIRED");
        }
        AuthService.AdminUserPasswordResult result =
                authService.adminSetPasswordByUserId(id, req.newPassword(), gen);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("user", mapBetaTester(result.user()));
        if (gen) {
            out.put("plainPassword", result.plainPassword());
        }
        return ResponseEntity.ok(out);
    }

    @PostMapping("/beta-testers/provision")
    public ResponseEntity<Map<String, Object>> adminProvisionTester(@RequestBody AdminProvisionTesterRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        if (req.identifier() == null || req.identifier().isBlank()) {
            throw new IllegalArgumentException("IDENTIFIER_REQUIRED");
        }
        boolean gen = Boolean.TRUE.equals(req.generatePassword());
        if (!gen && (req.newPassword() == null || req.newPassword().isBlank())) {
            throw new IllegalArgumentException("NEW_PASSWORD_OR_GENERATE_REQUIRED");
        }
        AuthService.AdminUserPasswordResult result = authService.adminProvisionBetaTester(
                req.identifier(), req.newPassword(), gen, req.displayName());
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("user", mapBetaTester(result.user()));
        out.put("created", result.created());
        if (gen) {
            out.put("plainPassword", result.plainPassword());
        }
        return ResponseEntity.ok(out);
    }

    @GetMapping("/beta-stats")
    public ResponseEntity<Map<String, Object>> betaStats() {
        adminAccessService.assertCurrentUserIsAdmin();
        long total = betaApplicationRepository.count();
        long pending = betaApplicationRepository.countByStatus("pending");
        long approved = betaApplicationRepository.countByStatus("approved");
        long rejected = betaApplicationRepository.countByStatus("rejected");
        long last7d = betaApplicationRepository.countByCreatedAtAfter(LocalDateTime.now().minusDays(7));
        long last30d = betaApplicationRepository.countByCreatedAtAfter(LocalDateTime.now().minusDays(30));
        long activeTesters = userRepository.countByIsBetaTesterTrue();
        long bugReportsTotal = bugReportRepository.count();
        long bugReportsOpen = bugReportRepository.countByStatus("open");
        long approvalRatePct = total == 0 ? 0L : Math.round((approved * 100.0) / total);

        List<Map<String, Object>> byCountry = betaApplicationRepository.countGroupByCountry().stream()
                .map(row -> {
                    Map<String, Object> entry = new LinkedHashMap<>();
                    String country = row[0] == null ? "" : row[0].toString();
                    entry.put("country", country.isBlank() ? "unknown" : country);
                    entry.put("total", ((Number) row[1]).longValue());
                    return entry;
                })
                .collect(Collectors.toList());

        List<Map<String, Object>> byExperience = betaApplicationRepository.countGroupByExperienceLevel().stream()
                .map(row -> {
                    Map<String, Object> entry = new LinkedHashMap<>();
                    String level = row[0] == null ? "" : row[0].toString();
                    entry.put("level", level.isBlank() ? "unknown" : level);
                    entry.put("total", ((Number) row[1]).longValue());
                    return entry;
                })
                .collect(Collectors.toList());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("total", total);
        out.put("pending", pending);
        out.put("approved", approved);
        out.put("rejected", rejected);
        out.put("last7d", last7d);
        out.put("last30d", last30d);
        out.put("activeTesters", activeTesters);
        out.put("bugReportsTotal", bugReportsTotal);
        out.put("bugReportsOpen", bugReportsOpen);
        out.put("approvalRatePct", approvalRatePct);
        out.put("byCountry", byCountry);
        out.put("byExperience", byExperience);
        return ResponseEntity.ok(out);
    }

    @GetMapping("/beta-applications")
    public ResponseEntity<List<Map<String, Object>>> betaApplications(@RequestParam(required = false) String status) {
        adminAccessService.assertCurrentUserIsAdmin();
        List<BetaApplication> items = (status == null || status.isBlank())
                ? betaApplicationRepository.findAllByOrderByCreatedAtDesc()
                : betaApplicationRepository.findByStatusOrderByCreatedAtDesc(status.trim().toLowerCase());
        return ResponseEntity.ok(items.stream().map(this::mapBetaApplication).collect(Collectors.toList()));
    }

    @PatchMapping("/beta-applications/{id}/review")
    public ResponseEntity<Map<String, Object>> reviewBetaApplication(@PathVariable UUID id,
                                                                     @Valid @RequestBody ReviewBetaApplicationRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        BetaApplication app = betaApplicationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("BETA_APPLICATION_NOT_FOUND"));
        String action = req.action() == null ? "" : req.action().trim().toLowerCase();
        if (!List.of("approve", "reject").contains(action)) {
            throw new IllegalArgumentException("INVALID_BETA_APPLICATION_ACTION");
        }
        app.setStatus("approve".equals(action) ? "approved" : "rejected");
        app.setReviewedAt(LocalDateTime.now());
        String plainPassword = null;
        User approvedUser = null;
        if ("approve".equals(action)) {
            boolean gen = req.generatePassword() == null || Boolean.TRUE.equals(req.generatePassword());
            User user = null;
            if (req.userId() != null) {
                user = userRepository.findById(req.userId()).orElse(null);
            }
            if (user == null && app.getEmail() != null) {
                user = userRepository.findByEmail(app.getEmail().trim().toLowerCase()).orElse(null);
            }
            if (user != null) {
                user.setIsBetaTester(true);
                if (user.getBetaCountry() == null || user.getBetaCountry().isBlank()) {
                    user.setBetaCountry(trim(app.getCountry(), 80));
                }
                if (user.getBetaExperienceLevel() == null || user.getBetaExperienceLevel().isBlank()) {
                    user.setBetaExperienceLevel(trim(app.getExperienceLevel(), 40));
                }
                userRepository.save(user);
                if (gen) {
                    AuthService.AdminUserPasswordResult res =
                            authService.adminSetPasswordByUserId(user.getId(), null, true);
                    plainPassword = res.plainPassword();
                    approvedUser = res.user();
                } else {
                    approvedUser = user;
                }
            } else {
                if (!gen) {
                    throw new IllegalArgumentException("APPROVE_NEW_USER_REQUIRES_GENERATED_PASSWORD");
                }
                AuthService.AdminUserPasswordResult res = authService.adminProvisionBetaTester(
                        app.getEmail().trim(),
                        null,
                        true,
                        app.getName());
                plainPassword = res.plainPassword();
                approvedUser = res.user();
            }
            app.setApprovedUserId(approvedUser.getId());
        }
        betaApplicationRepository.save(app);
        Map<String, Object> out = new LinkedHashMap<>(mapBetaApplication(app));
        if (plainPassword != null) {
            out.put("plainPassword", plainPassword);
        }
        if (approvedUser != null) {
            out.put("approvedUser", mapBetaTester(approvedUser));
        }
        return ResponseEntity.ok(out);
    }

    private Map<String, Object> mapUser(User u) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", u.getId());
        out.put("email", u.getEmail());
        out.put("displayName", u.getDisplayName() == null ? "" : u.getDisplayName());
        out.put("plan", u.getPlan() == null ? "FREE" : u.getPlan().name());
        out.put("isBetaTester", Boolean.TRUE.equals(u.getIsBetaTester()));
        out.put("createdAt", u.getCreatedAt());
        out.put("lastActivityAt", u.getLastActivityAt());
        return out;
    }

    private Map<String, Object> mapPartnerSyncRun(PartnerListingSyncRun run) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", run.getId());
        out.put("officialVendorId", run.getOfficialVendorId());
        out.put("triggerSource", run.getTriggerSource().name().toLowerCase());
        out.put("status", run.getStatus().name().toLowerCase());
        out.put("startedAt", run.getStartedAt());
        out.put("finishedAt", run.getFinishedAt());
        out.put("processedCount", run.getProcessedCount());
        out.put("upsertedCount", run.getUpsertedCount());
        out.put("staleCount", run.getStaleCount());
        out.put("failedCount", run.getFailedCount());
        out.put("skippedCount", run.getSkippedCount());
        out.put("errorMessage", run.getErrorMessage() == null ? "" : run.getErrorMessage());
        return out;
    }

    private Map<String, Object> mapBugReport(BugReport r) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", r.getId());
        out.put("userId", r.getUserId());
        out.put("severity", r.getSeverity());
        out.put("title", r.getTitle());
        out.put("description", r.getDescription());
        out.put("expectedBehavior", r.getExpectedBehavior());
        out.put("currentUrl", r.getCurrentUrl());
        out.put("userAgent", r.getUserAgent());
        out.put("viewport", r.getViewport());
        out.put("appVersion", r.getAppVersion());
        out.put("screenshotUrl", r.getScreenshotUrl());
        out.put("status", r.getStatus());
        out.put("resolutionNote", r.getResolutionNote());
        out.put("createdAt", r.getCreatedAt());
        out.put("resolvedAt", r.getResolvedAt());
        return out;
    }

    private Map<String, Object> mapBetaTester(User user) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", user.getId());
        out.put("email", user.getEmail());
        out.put("displayName", user.getDisplayName() == null ? "" : user.getDisplayName());
        out.put("betaCohort", user.getBetaCohort() == null ? "" : user.getBetaCohort());
        out.put("betaCountry", user.getBetaCountry() == null ? "" : user.getBetaCountry());
        out.put("betaExperienceLevel", user.getBetaExperienceLevel() == null ? "" : user.getBetaExperienceLevel());
        out.put("isBetaTester", Boolean.TRUE.equals(user.getIsBetaTester()));
        out.put("createdAt", user.getCreatedAt());
        out.put("bugReportsCount", bugReportRepository.countByUserId(user.getId()));
        return out;
    }

    private Map<String, Object> mapBetaApplication(BetaApplication app) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", app.getId());
        out.put("email", app.getEmail());
        out.put("name", app.getName() == null ? "" : app.getName());
        out.put("country", app.getCountry() == null ? "" : app.getCountry());
        out.put("experienceLevel", app.getExperienceLevel() == null ? "" : app.getExperienceLevel());
        out.put("devices", app.getDevices() == null ? "" : app.getDevices());
        out.put("notes", app.getNotes() == null ? "" : app.getNotes());
        out.put("status", app.getStatus());
        out.put("approvedUserId", app.getApprovedUserId());
        out.put("createdAt", app.getCreatedAt());
        out.put("reviewedAt", app.getReviewedAt());
        return out;
    }

    private String trim(String value, int max) {
        if (value == null) return null;
        String out = value.trim();
        if (out.isEmpty()) return null;
        return out.length() <= max ? out : out.substring(0, max);
    }
}
