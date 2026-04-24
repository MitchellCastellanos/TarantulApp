package com.tarantulapp.controller;

import com.tarantulapp.entity.User;
import com.tarantulapp.repository.ReminderRepository;
import com.tarantulapp.repository.TarantulaRepository;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.service.AdminAccessService;
import com.tarantulapp.service.OfficialVendorService;
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

    public AdminController(AdminAccessService adminAccessService,
                           UserRepository userRepository,
                           TarantulaRepository tarantulaRepository,
                           ReminderRepository reminderRepository,
                           OfficialVendorService officialVendorService,
                           PartnerListingSyncService partnerListingSyncService) {
        this.adminAccessService = adminAccessService;
        this.userRepository = userRepository;
        this.tarantulaRepository = tarantulaRepository;
        this.reminderRepository = reminderRepository;
        this.officialVendorService = officialVendorService;
        this.partnerListingSyncService = partnerListingSyncService;
    }

    record SetOfficialVendorStatusRequest(Boolean enabled) {}

    record UpdateOfficialVendorStrategicRequest(Boolean strategicFounder, Boolean listingImportEnabled) {}

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

    private Map<String, Object> mapUser(User u) {
        return Map.of(
                "id", u.getId(),
                "email", u.getEmail(),
                "displayName", u.getDisplayName() == null ? "" : u.getDisplayName(),
                "plan", u.getPlan() == null ? "FREE" : u.getPlan().name(),
                "createdAt", u.getCreatedAt()
        );
    }

    private Map<String, Object> mapPartnerSyncRun(PartnerListingSyncRun run) {
        Map<String, Object> out = new java.util.LinkedHashMap<>();
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
}
