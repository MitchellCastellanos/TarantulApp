package com.tarantulapp.controller;

import com.tarantulapp.dto.AdminCreatePassportRequest;
import com.tarantulapp.dto.AdminCreatePassportResponse;
import com.tarantulapp.entity.Subscription;
import com.tarantulapp.entity.User;
import com.tarantulapp.entity.UserPlan;
import com.tarantulapp.entity.BugReport;
import com.tarantulapp.entity.BetaApplication;
import com.tarantulapp.entity.BetaEmailSend;
import com.tarantulapp.repository.BetaApplicationRepository;
import com.tarantulapp.repository.BetaEmailSendRepository;
import com.tarantulapp.repository.BugReportRepository;
import com.tarantulapp.repository.MarketplaceListingRepository;
import com.tarantulapp.repository.ReminderRepository;
import com.tarantulapp.repository.SubscriptionRepository;
import com.tarantulapp.repository.TarantulaRepository;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.service.AdminAccessService;
import com.tarantulapp.service.AuthService;
import com.tarantulapp.service.BetaTesterGoogleGroupSyncService;
import com.tarantulapp.service.GoogleGroupSyncAsyncInvoker;
import com.tarantulapp.service.EmailService;
import com.tarantulapp.service.ListingEventService;
import com.tarantulapp.service.PlanAccessService;
import com.tarantulapp.service.PickupPointService;
import com.tarantulapp.entity.ProDayGrantSource;
import com.tarantulapp.service.PassportService;
import com.tarantulapp.service.OfficialVendorService;
import com.tarantulapp.service.PartnerDashboardService;
import com.tarantulapp.service.ProDayGrantService;
import com.tarantulapp.service.TaxonomyDiscoveryService;
import com.tarantulapp.service.TaxonomySyncService;
import com.tarantulapp.service.VendorInviteService;
import com.tarantulapp.service.MarketplaceService;
import com.tarantulapp.service.UserCapabilitiesService;
import com.tarantulapp.service.VendorBoostCreditService;
import com.tarantulapp.service.VerifiedOriginService;
import com.tarantulapp.entity.VerifiedOriginKind;
import com.tarantulapp.service.VendorVerificationService;
import com.tarantulapp.service.NewsletterService;
import com.tarantulapp.service.ReferralService;
import com.tarantulapp.service.TopVendorService;
import com.tarantulapp.service.TarantulaPublicDefaultAnnouncementService;
import com.tarantulapp.util.SecurityHelper;
import com.tarantulapp.service.vendors.sync.PartnerListingSyncService;
import com.tarantulapp.entity.PartnerListingSyncRun;
import com.tarantulapp.util.BetaMailBodies;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Set;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
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
    private final BetaEmailSendRepository betaEmailSendRepository;
    private final AuthService authService;
    private final EmailService emailService;
    private final PlanAccessService planAccessService;
    private final GoogleGroupSyncAsyncInvoker googleGroupSyncAsyncInvoker;
    private final BetaTesterGoogleGroupSyncService betaTesterGoogleGroupSyncService;
    private final ProDayGrantService proDayGrantService;
    private final SecurityHelper securityHelper;
    private final MarketplaceListingRepository marketplaceListingRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final VendorInviteService vendorInviteService;
    private final ListingEventService listingEventService;
    private final com.tarantulapp.repository.PartnerListingRepository partnerListingRepository;
    private final NewsletterService newsletterService;
    private final TopVendorService topVendorService;
    private final ReferralService referralService;
    private final TarantulaPublicDefaultAnnouncementService tarantulaPublicDefaultAnnouncementService;
    private final VendorVerificationService vendorVerificationService;
    private final MarketplaceService marketplaceService;
    private final PassportService passportService;
    private final UserCapabilitiesService userCapabilitiesService;
    private final VendorBoostCreditService vendorBoostCreditService;
    private final VerifiedOriginService verifiedOriginService;
    private final PartnerDashboardService partnerDashboardService;
    private final PickupPointService pickupPointService;

    @Value("${spring.mail.host:}")
    private String springMailHost;

    @Value("${spring.mail.port:0}")
    private int springMailPort;

    @Value("${spring.mail.username:}")
    private String springMailUsername;

    @Value("${app.mail.from:}")
    private String appMailFrom;

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
                           BetaEmailSendRepository betaEmailSendRepository,
                           AuthService authService,
                           EmailService emailService,
                           PlanAccessService planAccessService,
                           GoogleGroupSyncAsyncInvoker googleGroupSyncAsyncInvoker,
                           BetaTesterGoogleGroupSyncService betaTesterGoogleGroupSyncService,
                           ProDayGrantService proDayGrantService,
                           SecurityHelper securityHelper,
                           MarketplaceListingRepository marketplaceListingRepository,
                           SubscriptionRepository subscriptionRepository,
                           VendorInviteService vendorInviteService,
                           ListingEventService listingEventService,
                           com.tarantulapp.repository.PartnerListingRepository partnerListingRepository,
                           NewsletterService newsletterService,
                           TopVendorService topVendorService,
                           ReferralService referralService,
                           TarantulaPublicDefaultAnnouncementService tarantulaPublicDefaultAnnouncementService,
                           VendorVerificationService vendorVerificationService,
                           MarketplaceService marketplaceService,
                           PassportService passportService,
                           UserCapabilitiesService userCapabilitiesService,
                           VendorBoostCreditService vendorBoostCreditService,
                           VerifiedOriginService verifiedOriginService,
                           PartnerDashboardService partnerDashboardService,
                           PickupPointService pickupPointService) {
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
        this.betaEmailSendRepository = betaEmailSendRepository;
        this.authService = authService;
        this.emailService = emailService;
        this.planAccessService = planAccessService;
        this.googleGroupSyncAsyncInvoker = googleGroupSyncAsyncInvoker;
        this.betaTesterGoogleGroupSyncService = betaTesterGoogleGroupSyncService;
        this.proDayGrantService = proDayGrantService;
        this.securityHelper = securityHelper;
        this.marketplaceListingRepository = marketplaceListingRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.vendorInviteService = vendorInviteService;
        this.listingEventService = listingEventService;
        this.partnerListingRepository = partnerListingRepository;
        this.newsletterService = newsletterService;
        this.topVendorService = topVendorService;
        this.referralService = referralService;
        this.tarantulaPublicDefaultAnnouncementService = tarantulaPublicDefaultAnnouncementService;
        this.vendorVerificationService = vendorVerificationService;
        this.marketplaceService = marketplaceService;
        this.passportService = passportService;
        this.userCapabilitiesService = userCapabilitiesService;
        this.vendorBoostCreditService = vendorBoostCreditService;
        this.verifiedOriginService = verifiedOriginService;
        this.partnerDashboardService = partnerDashboardService;
        this.pickupPointService = pickupPointService;
    }

    @PostMapping("/passports")
    public ResponseEntity<AdminCreatePassportResponse> createPassport(@Valid @RequestBody AdminCreatePassportRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(passportService.createUnclaimedPassport(req));
    }

    record SetOfficialVendorStatusRequest(Boolean enabled) {}

    record UpdateOfficialVendorStrategicRequest(Boolean strategicFounder,
                                                Boolean listingImportEnabled,
                                                String partnerProgramTier,
                                                String feedType,
                                                String feedBaseUrl,
                                                Map<String, Object> feedConfig,
                                                String badge,
                                                String websiteUrl,
                                                Integer influenceScore,
                                                String note) {}
    record PromoteOfficialVendorLeadRequest(Boolean enableImport,
                                            Boolean strategicFounder,
                                            String partnerProgramTier,
                                            String feedType,
                                            String feedBaseUrl,
                                            Map<String, Object> feedConfig,
                                            String badge,
                                            Integer influenceScore) {}
    record CreateOfficialVendorRequest(String name,
                                       String slug,
                                       String country,
                                       String state,
                                       String city,
                                       String websiteUrl,
                                       String partnerProgramTier,
                                       Boolean enabled,
                                       Boolean enableImport,
                                       String badge,
                                        Integer influenceScore,
                                        String note) {}
    record VendorPickupPointsRequest(List<UUID> pickupPointIds, UUID defaultPickupPointId) {}
    record ListingPickupPointsRequest(List<UUID> pickupPointIds) {}
    record PartnerFeatureReviewRequest(String action, String adminNote, String responseMessage) {}
    record PromoteUserOfficialPartnerRequest(String partnerProgramTier,
                                             Boolean enabled,
                                             Boolean enableImport,
                                             String badge,
                                             String websiteUrl,
                                             String note) {}
    record ResolveBugReportRequest(String status, String note) {}
    record SetBetaTesterRequest(Boolean isBetaTester, String cohort, String country, String experienceLevel,
                                String preferredLocale) {}
    record SetVerifiedBreederRequest(Boolean verifiedBreeder, Boolean sendEmail, String locale) {}
    record SetMarketingOpsRequest(Boolean marketingOps) {}

    record ProvisionMarketingTeamRequest(
            @Email @NotBlank String email,
            String displayName,
            Boolean sendWelcomeEmail,
            Boolean resetPassword
    ) {}

    record SetStorefrontVerifiedRequest(Boolean storefrontVerified, Boolean sendEmail, String locale) {}
    record SetPickupAuthorizedRequest(Boolean pickupAuthorized, Boolean sendEmail, String locale, String note) {}
    /**
     * {@code generatePassword}: when {@code null} or true, a password is generated on approve (default).
     * {@code sendWelcomeEmail}: when true and a new plain password was produced, sends SMTP welcome (same copy as admin templates).
     */
    record ReviewBetaApplicationRequest(
            String action,
            UUID userId,
            String note,
            Boolean generatePassword,
            Boolean sendWelcomeEmail,
            String welcomeLocale
    ) {}

    record BetaCampaignBatchRequest(String campaignKey, List<UUID> userIds, String locale) {}
    record AdminSetUserPasswordRequest(String newPassword, Boolean generatePassword) {}
    record AdminProvisionTesterRequest(String identifier, String newPassword, Boolean generatePassword, String displayName) {}

    record SendBetaWelcomeEmailRequest(String locale, String plainPassword) {}

    record SendOutreachEmailRequest(@NotBlank String templateKey, String locale) {}

    record VendorInviteSendRequest(String locale) {}
    record GrantBoostCreditsRequest(Integer count, Boolean sendEmail, String locale) {}

    /**
     * {@code plan}: {@code FREE} | {@code PRO}. {@code extendTrialDays}: optional extra trial window from max(now, current trial end).
     * {@code reason}: REQUIRED whenever {@code extendTrialDays > 0} so the day grant has a non-empty audit trail
     * and the user-facing email can quote a meaningful motive (e.g. "Halloween campaign comp").
     */
    record AdminSetPlanRequest(String plan, Integer extendTrialDays, String reason) {}

    record MailTestSendRequest(@NotBlank @Email String to) {}

    @GetMapping("/mail/config-status")
    public ResponseEntity<Map<String, Object>> mailConfigStatus() {
        adminAccessService.assertCurrentUserIsAdmin();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("host", springMailHost == null || springMailHost.isBlank() ? "(not set)" : springMailHost);
        m.put("port", springMailPort);
        m.put("usernameConfigured", springMailUsername != null && !springMailUsername.isBlank());
        m.put("fromAddress", appMailFrom == null || appMailFrom.isBlank() ? "(not set)" : appMailFrom);
        return ResponseEntity.ok(m);
    }

    @PostMapping("/mail/test-send")
    public ResponseEntity<Map<String, Object>> mailTestSend(@Valid @RequestBody MailTestSendRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        try {
            emailService.sendSmtpTestEmail(req.to());
        } catch (RuntimeException e) {
            Map<String, Object> err = new LinkedHashMap<>();
            err.put("status", "error");
            err.put("to", req.to());
            err.put("message", e.getMessage());
            return ResponseEntity.status(502).body(err);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("status", "sent");
        out.put("to", req.to());
        return ResponseEntity.ok(out);
    }

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
    public ResponseEntity<Map<String, Object>> recentUsers(
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "activity") String sort) {
        adminAccessService.assertCurrentUserIsAdmin();
        int cap = Math.min(Math.max(limit, 1), 200);
        Pageable page = PageRequest.of(0, cap);
        List<User> users = "created".equalsIgnoreCase(sort == null ? "" : sort.trim())
                ? userRepository.findUsersForAdminOrderByCreatedDesc(page)
                : userRepository.findUsersForAdminOrderByLastActivityDesc(page);
        Map<UUID, Long> spiderCounts = loadTarantulaCountsForUsers(
                users.stream().map(User::getId).collect(Collectors.toList()));
        List<Map<String, Object>> rows = users.stream()
                .map(u -> mapUser(u, spiderCounts))
                .collect(Collectors.toList());
        long totalUsers = userRepository.count();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("users", rows);
        body.put("totalUsers", totalUsers);
        body.put("limit", cap);
        body.put("sort", "created".equalsIgnoreCase(sort == null ? "" : sort.trim()) ? "created" : "activity");
        return ResponseEntity.ok(body);
    }

    @GetMapping("/official-vendors")
    public ResponseEntity<List<Map<String, Object>>> officialVendors() {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(officialVendorService.adminListVendors());
    }

    @GetMapping("/official-vendor-leads")
    public ResponseEntity<List<Map<String, Object>>> officialVendorLeads() {
        adminAccessService.assertCurrentUserCanUseMarketingTools();
        return ResponseEntity.ok(officialVendorService.adminListLeads());
    }

    @GetMapping("/partner-feature-requests")
    public ResponseEntity<List<Map<String, Object>>> partnerFeatureRequests() {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(officialVendorService.adminListFeatureRequests());
    }

    @PatchMapping("/partner-feature-requests/{id}")
    public ResponseEntity<Map<String, Object>> reviewPartnerFeatureRequest(
            @PathVariable UUID id,
            @RequestBody PartnerFeatureReviewRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        try {
            return ResponseEntity.ok(officialVendorService.adminReviewFeatureRequest(
                    id,
                    req == null ? null : req.action(),
                    req == null ? null : req.adminNote(),
                    req == null ? null : req.responseMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    record AdminUpsertOutreachLeadRequest(
            String businessName,
            String contactEmail,
            String contactName,
            String websiteUrl,
            String country,
            String state,
            String city,
            String shippingScope,
            String note,
            String outreachLocale,
            Map<String, Object> qualification,
            String internalNotes
    ) {}

    @PostMapping("/official-vendor-leads/outreach")
    public ResponseEntity<Map<String, Object>> upsertOfficialVendorOutreachLead(
            @RequestBody AdminUpsertOutreachLeadRequest req) {
        adminAccessService.assertCurrentUserCanUseMarketingTools();
        try {
            return ResponseEntity.ok(officialVendorService.adminUpsertOutreachLead(
                    req.businessName(),
                    req.contactEmail(),
                    req.contactName(),
                    req.websiteUrl(),
                    req.country(),
                    req.state(),
                    req.city(),
                    req.shippingScope(),
                    req.note(),
                    req.outreachLocale(),
                    req.qualification(),
                    req.internalNotes()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    record AdminPatchLeadOutreachRequest(
            String outreachLocale,
            Map<String, Object> qualification,
            String internalNotes,
            String websiteUrl
    ) {}

    @PatchMapping("/official-vendor-leads/{id}/outreach")
    public ResponseEntity<Map<String, Object>> patchOfficialVendorLeadOutreach(
            @PathVariable UUID id,
            @RequestBody AdminPatchLeadOutreachRequest req) {
        adminAccessService.assertCurrentUserCanUseMarketingTools();
        try {
            return ResponseEntity.ok(officialVendorService.adminPatchLeadOutreach(
                    id,
                    req == null ? null : req.outreachLocale(),
                    req == null ? null : req.qualification(),
                    req == null ? null : req.internalNotes(),
                    req == null ? null : req.websiteUrl()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    record WooProbeRequest(String websiteUrl) {}

    record PartnerReadinessRequest(
            String websiteUrl,
            String feedUrl,
            String shopifyShopDomain,
            String shopifyAccessToken,
            String lightspeedApiKey,
            String lightspeedApiSecret,
            String lightspeedLang) {}

    @PostMapping("/official-vendor-leads/probe-woocommerce")
    public ResponseEntity<Map<String, Object>> probeWooCommerceForLead(
            @RequestBody WooProbeRequest req) {
        adminAccessService.assertCurrentUserCanUseMarketingTools();
        try {
            return ResponseEntity.ok(officialVendorService.adminProbeWooCommerce(
                    req == null ? null : req.websiteUrl()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/official-vendor-leads/{id}/probe-woocommerce")
    public ResponseEntity<Map<String, Object>> probeWooCommerceForLeadById(@PathVariable UUID id) {
        adminAccessService.assertCurrentUserCanUseMarketingTools();
        try {
            return ResponseEntity.ok(officialVendorService.adminProbeAndSaveLeadWoo(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/official-vendor-leads/readiness-report")
    public ResponseEntity<Map<String, Object>> partnerReadinessReport(@RequestBody PartnerReadinessRequest req) {
        adminAccessService.assertCurrentUserCanUseMarketingTools();
        try {
            return ResponseEntity.ok(officialVendorService.adminPartnerReadinessReport(
                    req == null ? null : req.websiteUrl(),
                    req == null ? null : req.feedUrl(),
                    req == null ? null : req.shopifyShopDomain(),
                    req == null ? null : req.shopifyAccessToken(),
                    req == null ? null : req.lightspeedApiKey(),
                    req == null ? null : req.lightspeedApiSecret(),
                    req == null ? null : req.lightspeedLang()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/official-vendor-leads/{id}/readiness-report")
    public ResponseEntity<Map<String, Object>> partnerReadinessReportForLead(@PathVariable UUID id) {
        adminAccessService.assertCurrentUserCanUseMarketingTools();
        try {
            return ResponseEntity.ok(officialVendorService.adminPartnerReadinessReportForLead(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    record SendLeadOutreachEmailRequest(String template, String locale, Boolean attachOnePager) {}

    @PostMapping("/official-vendor-leads/{id}/send-outreach-email")
    public ResponseEntity<Map<String, Object>> sendOfficialVendorLeadOutreachEmail(
            @PathVariable UUID id,
            @RequestBody(required = false) SendLeadOutreachEmailRequest req) {
        adminAccessService.assertCurrentUserCanUseMarketingTools();
        try {
            return ResponseEntity.ok(officialVendorService.adminSendLeadOutreachEmail(
                    id,
                    req == null ? null : req.template(),
                    req == null ? null : req.locale(),
                    req != null && Boolean.TRUE.equals(req.attachOnePager())));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("sent", false, "error", e.getMessage()));
        }
    }

    @GetMapping("/vendor-verifications")
    public ResponseEntity<List<Map<String, Object>>> vendorVerifications(
            @RequestParam(required = false) String status) {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(vendorVerificationService.adminList(status));
    }

    @PatchMapping("/vendor-verifications/{id}")
    public ResponseEntity<Map<String, Object>> reviewVendorVerification(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        adminAccessService.assertCurrentUserIsAdmin();
        String status = body != null ? body.get("status") : null;
        String note = body != null ? body.get("reviewerNote") : null;
        try {
            return ResponseEntity.ok(vendorVerificationService.adminReview(id, status, note));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    record SendPartnerCatalogEmailRequest(String email, String locale) {}

    @PostMapping("/official-vendors/{id}/send-partner-catalog-email")
    public ResponseEntity<Map<String, Object>> sendOfficialVendorPartnerCatalogEmail(
            @PathVariable UUID id,
            @RequestBody(required = false) SendPartnerCatalogEmailRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        try {
            String loc = req != null && req.locale() != null ? req.locale() : "es";
            return ResponseEntity.ok(officialVendorService.sendPartnerCatalogLiveEmail(
                    id, req != null ? req.email() : null, loc));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("sent", false, "error", e.getMessage()));
        }
    }

    @PostMapping("/official-vendor-leads/{id}/send-partner-catalog-email")
    public ResponseEntity<Map<String, Object>> sendOfficialVendorLeadPartnerCatalogEmail(
            @PathVariable UUID id,
            @RequestBody(required = false) SendPartnerCatalogEmailRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        try {
            String loc = req != null && req.locale() != null ? req.locale() : "es";
            return ResponseEntity.ok(officialVendorService.sendPartnerCatalogLiveEmailForLead(id, loc));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("sent", false, "error", e.getMessage()));
        }
    }

    @PostMapping("/official-vendor-leads/{id}/promote")
    public ResponseEntity<Map<String, Object>> promoteOfficialVendorLead(
            @PathVariable UUID id,
            @RequestBody(required = false) PromoteOfficialVendorLeadRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        boolean enableImport = req != null && Boolean.TRUE.equals(req.enableImport());
        boolean strategicFounder = req != null && Boolean.TRUE.equals(req.strategicFounder());
        try {
            return ResponseEntity.ok(officialVendorService.adminPromoteLeadToVendor(
                    id,
                    enableImport,
                    strategicFounder,
                    req == null ? null : req.partnerProgramTier(),
                    req == null ? null : req.feedType(),
                    req == null ? null : req.feedBaseUrl(),
                    req == null ? null : req.feedConfig(),
                    req == null ? null : req.badge(),
                    req == null ? null : req.influenceScore()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/official-vendors")
    public ResponseEntity<Map<String, Object>> createOfficialVendor(
            @RequestBody CreateOfficialVendorRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        if (req == null || req.name() == null || req.name().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "NAME_REQUIRED"));
        }
        try {
            return ResponseEntity.ok(officialVendorService.adminCreateOfficialVendor(
                    req.name(),
                    req.slug(),
                    req.country(),
                    req.state(),
                    req.city(),
                    req.websiteUrl(),
                    req.partnerProgramTier(),
                    req.enabled(),
                    req.enableImport(),
                    req.badge(),
                    req.influenceScore(),
                    req.note()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/pickup-points")
    public ResponseEntity<List<Map<String, Object>>> pickupPoints() {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(pickupPointService.adminListPickupPoints());
    }

    @PostMapping("/pickup-points")
    public ResponseEntity<Map<String, Object>> createPickupPoint(@RequestBody Map<String, Object> req) {
        adminAccessService.assertCurrentUserIsAdmin();
        try {
            return ResponseEntity.ok(pickupPointService.adminCreatePickupPoint(req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/pickup-points/{id}")
    public ResponseEntity<Map<String, Object>> updatePickupPoint(@PathVariable UUID id,
                                                                 @RequestBody Map<String, Object> req) {
        adminAccessService.assertCurrentUserIsAdmin();
        try {
            return ResponseEntity.ok(pickupPointService.adminUpdatePickupPoint(id, req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/official-vendors/{id}/pickup-points")
    public ResponseEntity<Map<String, Object>> officialVendorPickupPoints(@PathVariable UUID id) {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(pickupPointService.adminVendorPickupConfig(id));
    }

    @PutMapping("/official-vendors/{id}/pickup-points")
    public ResponseEntity<Map<String, Object>> setOfficialVendorPickupPoints(
            @PathVariable UUID id,
            @RequestBody(required = false) VendorPickupPointsRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        try {
            return ResponseEntity.ok(pickupPointService.adminSetVendorPickupPoints(
                    id,
                    req == null ? List.of() : req.pickupPointIds(),
                    req == null ? null : req.defaultPickupPointId()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/partner-listings/{id}/pickup-points")
    public ResponseEntity<Map<String, Object>> setPartnerListingPickupPoints(
            @PathVariable UUID id,
            @RequestBody(required = false) ListingPickupPointsRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        try {
            return ResponseEntity.ok(pickupPointService.adminSetListingPickupPoints(
                    id,
                    req == null ? List.of() : req.pickupPointIds()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/official-vendors/{id}/branding")
    public ResponseEntity<Map<String, Object>> officialVendorBranding(@PathVariable UUID id) {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(officialVendorService.adminVendorBranding(id));
    }

    @PostMapping(value = "/official-vendors/{id}/logo", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadOfficialVendorLogo(@PathVariable UUID id,
                                                                         @RequestParam("file") org.springframework.web.multipart.MultipartFile file)
            throws java.io.IOException {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(officialVendorService.adminUploadVendorLogo(id, file));
    }

    @DeleteMapping("/official-vendors/{id}/logo")
    public ResponseEntity<Map<String, Object>> deleteOfficialVendorLogo(@PathVariable UUID id) {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(officialVendorService.adminDeleteVendorLogo(id));
    }

    @PostMapping("/users/{id}/promote-official-partner")
    public ResponseEntity<Map<String, Object>> promoteUserToOfficialPartner(
            @PathVariable UUID id,
            @RequestBody(required = false) PromoteUserOfficialPartnerRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        try {
            return ResponseEntity.ok(officialVendorService.adminPromoteUserToOfficialPartner(
                    id,
                    req == null ? null : req.partnerProgramTier(),
                    req == null ? null : req.enabled(),
                    req == null ? null : req.enableImport(),
                    req == null ? null : req.badge(),
                    req == null ? null : req.websiteUrl(),
                    req == null ? null : req.note()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
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
        if (req.strategicFounder() == null
                && req.listingImportEnabled() == null
                && req.partnerProgramTier() == null
                && req.feedType() == null
                && req.feedBaseUrl() == null
                && req.feedConfig() == null
                && req.badge() == null
                && req.websiteUrl() == null
                && req.influenceScore() == null
                && req.note() == null) {
            throw new IllegalArgumentException("partner config update requerido");
        }
        return ResponseEntity.ok(officialVendorService.adminUpdateStrategicProgram(
                id,
                req.strategicFounder(),
                req.listingImportEnabled(),
                req.partnerProgramTier(),
                req.feedType(),
                req.feedBaseUrl(),
                req.feedConfig(),
                req.badge(),
                req.websiteUrl(),
                req.influenceScore(),
                req.note()));
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

    @PostMapping("/partner-sync/run/{vendorId}")
    public ResponseEntity<Map<String, Object>> runPartnerSyncForVendor(@PathVariable UUID vendorId) {
        adminAccessService.assertCurrentUserIsAdmin();
        try {
            return ResponseEntity.ok(mapPartnerSyncRun(partnerListingSyncService.runManualSyncForVendor(vendorId)));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
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

    @GetMapping("/partner-ecosystem/closure-status")
    public ResponseEntity<Map<String, Object>> partnerEcosystemClosureStatus() {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(officialVendorService.adminEcosystemClosureStatus());
    }

    @GetMapping("/partners/dashboard")
    public ResponseEntity<Map<String, Object>> partnerDashboard() {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(partnerDashboardService.getAdminDashboard());
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
        Map<UUID, Long> spiderCounts = loadTarantulaCountsForUsers(
                users.stream().map(User::getId).collect(Collectors.toList()));
        Map<UUID, String> betaDevicesByUser = loadBetaDevicesForApprovedUsers(
                users.stream().map(User::getId).collect(Collectors.toList()));
        List<Map<String, Object>> rows = users.stream()
                .map(u -> mapBetaTester(u, spiderCounts, betaDevicesByUser))
                .collect(Collectors.toList());
        enrichBetaCampaignSummaries(rows, users.stream().map(User::getId).collect(Collectors.toList()));
        return ResponseEntity.ok(rows);
    }

    @GetMapping("/beta-emails/campaign-catalog")
    public ResponseEntity<List<Map<String, Object>>> betaCampaignCatalog() {
        adminAccessService.assertCurrentUserIsAdmin();
        List<Map<String, Object>> rows = new ArrayList<>();
        String[][] data = {
                {"play_early_access_web", "Usuarios web — Android en Play (acceso anticipado / prueba cerrada)",
                        "Web users — Android on Play (early access / closed testing)"},
                {"creator_partner_onboarding", "Creadores — brief y beneficios (post-bienvenida)", "Creators — brief & perks (after welcome)"},
                {"creator_partner_reminder", "Creadores — recordatorio suave (video / contenido)", "Creators — gentle reminder (video)"},
                {"android_play_beta", "Android — anuncio prueba cerrada (enlace tienda)", "Android — closed testing announcement (Store link)"},
                {"vendor_welcome_mx", "Vendor MX — bienvenida + tier dinámico + cita videollamada verificación tienda",
                        "Vendor MX — welcome + dynamic tier + video verification booking"},
                {"partner_catalog_live", "Socio estratégico — vitrina en app (sin setup; opcional handoff)",
                        "Strategic partner — storefront live (zero setup; optional cart handoff test)"},
                {"tarantula_public_default", "Colección — arañas públicas por defecto (keepers con tarántulas)",
                        "Collection — spiders public by default (keepers with tarantulas)"},
        };
        for (String[] r : data) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("key", r[0]);
            m.put("labelEs", r[1]);
            m.put("labelEn", r[2]);
            rows.add(m);
        }
        return ResponseEntity.ok(rows);
    }

    @PostMapping("/beta-emails/send-campaign")
    public ResponseEntity<Map<String, Object>> sendBetaCampaignBatch(@RequestBody BetaCampaignBatchRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        if (req.userIds() == null || req.userIds().isEmpty()) {
            throw new IllegalArgumentException("USER_IDS_REQUIRED");
        }
        String key = req.campaignKey() == null ? "" : req.campaignKey().trim().toLowerCase();
        if (!BetaMailBodies.isBatchCampaignKey(key)) {
            throw new IllegalArgumentException("INVALID_BETA_CAMPAIGN_KEY");
        }
        String requestedLoc = req.locale() == null ? "" : req.locale().trim();
        boolean perTesterLocale = "auto".equalsIgnoreCase(requestedLoc);
        String defaultLoc = perTesterLocale ? "es" : BetaMailBodies.normalizeLocale(requestedLoc);
        List<Map<String, Object>> results = new ArrayList<>();
        int sent = 0;
        for (UUID uid : req.userIds()) {
            User u = userRepository.findById(uid).orElse(null);
            if (u == null) {
                results.add(new LinkedHashMap<>(Map.of("userId", uid, "status", "skipped", "reason", "USER_NOT_FOUND")));
                continue;
            }
            if (!Boolean.TRUE.equals(u.getIsBetaTester()) && !BetaMailBodies.allowsNonBetaRecipients(key)) {
                results.add(new LinkedHashMap<>(Map.of("userId", uid, "status", "skipped", "reason", "NOT_BETA_TESTER")));
                continue;
            }
            String loc = perTesterLocale
                    ? resolveCampaignLocale(u, key)
                    : defaultLoc;
            try {
                emailService.sendBetaCampaignEmail(u.getEmail(), u.getDisplayName(), key, loc);
                recordBetaEmailSent(uid, key, loc);
                sent++;
                results.add(new LinkedHashMap<>(Map.of("userId", uid, "status", "sent")));
            } catch (Exception e) {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("userId", uid);
                row.put("status", "failed");
                row.put("error", e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
                results.add(row);
            }
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("campaignKey", key);
        out.put("locale", perTesterLocale ? "auto" : defaultLoc);
        out.put("sent", sent);
        out.put("results", results);
        return ResponseEntity.ok(out);
    }

    @PostMapping("/tarantula-visibility/send-public-default-announcement")
    public ResponseEntity<Map<String, Object>> sendTarantulaPublicDefaultAnnouncement() {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(tarantulaPublicDefaultAnnouncementService.sendToKeepersWithCollection());
    }

    private static String resolveCampaignLocale(User u, String campaignKey) {
        if (BetaMailBodies.usesPreferredLocale(campaignKey)) {
            return TarantulaPublicDefaultAnnouncementService.resolveEmailLocale(u);
        }
        return BetaMailBodies.normalizeLocale(u.getBetaPreferredLocale());
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
        if (req.preferredLocale() != null) {
            String pl = req.preferredLocale().trim();
            if (pl.isEmpty()) {
                user.setBetaPreferredLocale(null);
            } else {
                user.setBetaPreferredLocale(BetaMailBodies.normalizeLocale(pl));
            }
        }
        userRepository.save(user);
        googleGroupSyncAsyncInvoker.scheduleAfterCommitOrNow(user.getId());
        User refreshedUser = userRepository.findById(user.getId()).orElse(user);
        return ResponseEntity.ok(mapBetaTester(refreshedUser));
    }

    /**
     * Manually add the user's email to the Play testing Google Group (Admin SDK). Synchronous so you see the result.
     * {@code force=true} clears local sync flags first so Google is called again even if the row was already {@code synced}.
     */
    @PostMapping("/users/{id}/google-testers-group-sync")
    public ResponseEntity<Map<String, Object>> syncGoogleTestersGroupForUser(@PathVariable UUID id,
                                                                             @RequestParam(defaultValue = "false") boolean force) {
        adminAccessService.assertCurrentUserIsAdmin();
        userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        betaTesterGoogleGroupSyncService.ensureGoogleTestersGroupMemberForAdmin(id, force);
        User refreshed = userRepository.findById(id).orElseThrow();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("userId", refreshed.getId());
        out.put("email", refreshed.getEmail());
        out.put("googleGroupSyncStatus", refreshed.getGoogleGroupSyncStatus() == null ? "" : refreshed.getGoogleGroupSyncStatus());
        out.put("googleGroupSyncLastError",
                refreshed.getGoogleGroupSyncLastError() == null ? "" : refreshed.getGoogleGroupSyncLastError());
        return ResponseEntity.ok(out);
    }

    @PatchMapping("/users/{id}/verified-breeder")
    public ResponseEntity<Map<String, Object>> setUserVerifiedBreeder(@PathVariable UUID id,
                                                                       @RequestBody(required = false) SetVerifiedBreederRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        User user = userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        boolean verified = req != null && Boolean.TRUE.equals(req.verifiedBreeder());
        user.setVerifiedBreeder(verified);
        user.setVerifiedBreederAt(verified ? Instant.now() : null);
        user.setVendorInviteToken(null);
        user.setVendorInviteSentAt(null);
        user.setVendorInviteExpiresAt(null);
        userRepository.save(user);
        if (verified) {
            newsletterService.ensureSubscribedOnVerified(user.getId());
            if (req == null || req.sendEmail() == null || Boolean.TRUE.equals(req.sendEmail())) {
                emailService.sendAdminCapabilityGrantEmail(
                        user.getEmail(),
                        user.getDisplayName(),
                        resolveUserLocale(user, req != null ? req.locale() : null),
                        "vendor",
                        vendorBoostCreditService.countAvailable(user.getId()));
            }
        }
        referralService.ensureReferralCodeForUser(user.getId());
        referralService.syncVendorReferralCodeFlag(user.getId());
        Map<UUID, Long> counts = loadTarantulaCountsForUsers(List.of(user.getId()));
        VendorRosterStats stats = loadVendorRosterStats(List.of(user.getId()));
        return ResponseEntity.ok(mapVendorDirectoryUser(user, counts, stats));
    }

    @PatchMapping("/users/{id}/marketing-ops")
    public ResponseEntity<Map<String, Object>> setUserMarketingOps(@PathVariable UUID id,
                                                                    @RequestBody(required = false) SetMarketingOpsRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        User user = userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        boolean enabled = req != null && Boolean.TRUE.equals(req.marketingOps());
        user.setIsMarketingOps(enabled);
        userRepository.save(user);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", user.getId());
        out.put("email", user.getEmail());
        out.put("marketingOps", Boolean.TRUE.equals(user.getIsMarketingOps()));
        return ResponseEntity.ok(out);
    }

    /**
     * Admin: find user by email or create a marketing-team account, grant marketing ops, optionally
     * reset password and send the English marketing welcome email.
     */
    @PostMapping("/marketing/provision-team-member")
    public ResponseEntity<Map<String, Object>> provisionMarketingTeamMember(
            @Valid @RequestBody ProvisionMarketingTeamRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        boolean sendWelcome = req.sendWelcomeEmail() == null || Boolean.TRUE.equals(req.sendWelcomeEmail());
        boolean resetPassword = req.resetPassword() == null || Boolean.TRUE.equals(req.resetPassword());

        User user = userRepository.findByEmail(email).orElse(null);
        boolean created = false;
        String plainPassword = null;
        if (user == null) {
            AuthService.AdminUserPasswordResult result =
                    authService.adminProvisionMarketingTeamMember(email, req.displayName());
            user = userRepository.findById(result.user().getId()).orElse(result.user());
            created = result.created();
            plainPassword = result.plainPassword();
        } else {
            user.setIsMarketingOps(true);
            if (req.displayName() != null && !req.displayName().isBlank()
                    && (user.getDisplayName() == null || user.getDisplayName().isBlank())) {
                user.setDisplayName(req.displayName().trim());
            }
            if (resetPassword) {
                AuthService.AdminUserPasswordResult pw =
                        authService.adminSetPasswordByUserId(user.getId(), null, true);
                plainPassword = pw.plainPassword();
                user = userRepository.findById(pw.user().getId()).orElse(user);
            }
            user.setIsMarketingOps(true);
            userRepository.save(user);
        }

        boolean welcomeSent = false;
        if (sendWelcome) {
            String name = user.getDisplayName() == null || user.getDisplayName().isBlank()
                    ? email : user.getDisplayName();
            emailService.sendMarketingTeamWelcomeEmail(email, name, plainPassword);
            welcomeSent = true;
        }

        Map<UUID, Long> counts = loadTarantulaCountsForUsers(List.of(user.getId()));
        VendorRosterStats stats = loadVendorRosterStats(List.of(user.getId()));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("user", mapVendorDirectoryUser(user, counts, stats));
        out.put("created", created);
        out.put("welcomeEmailSent", welcomeSent);
        if (plainPassword != null) {
            out.put("plainPassword", plainPassword);
        }
        return ResponseEntity.ok(out);
    }

    /** Admin: grant or revoke "Tienda verificada" trust badge (after live call or approved self-verification). */
    @PatchMapping("/users/{id}/storefront-verified")
    public ResponseEntity<Map<String, Object>> setUserStorefrontVerified(@PathVariable UUID id,
                                                                         @RequestBody(required = false) SetStorefrontVerifiedRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        User user = userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        boolean verified = req != null && Boolean.TRUE.equals(req.storefrontVerified());
        if (verified && !Boolean.TRUE.equals(user.getVerifiedBreeder())) {
            throw new IllegalArgumentException("VENDOR_ACTIVATION_REQUIRED");
        }
        if (verified) {
            verifiedOriginService.grantVerifiedOrigin(id, VerifiedOriginKind.VENDOR);
        } else {
            verifiedOriginService.revokeVerifiedOrigin(id);
        }
        user = userRepository.findById(id).orElseThrow();
        if (verified && (req == null || req.sendEmail() == null || Boolean.TRUE.equals(req.sendEmail()))) {
            emailService.sendVendorVerificationApproved(
                    user.getEmail(),
                    user.getDisplayName(),
                    resolveUserLocale(user, req != null ? req.locale() : null));
        }
        Map<UUID, Long> counts = loadTarantulaCountsForUsers(List.of(user.getId()));
        VendorRosterStats stats = loadVendorRosterStats(List.of(user.getId()));
        return ResponseEntity.ok(mapVendorDirectoryUser(user, counts, stats));
    }

    @PatchMapping("/users/{id}/pickup-authorization")
    public ResponseEntity<Map<String, Object>> setUserPickupAuthorization(@PathVariable UUID id,
                                                                          @RequestBody(required = false) SetPickupAuthorizedRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        User user = userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        boolean authorized = req != null && Boolean.TRUE.equals(req.pickupAuthorized());
        if (authorized && !Boolean.TRUE.equals(user.getVerifiedBreeder()) && !officialVendorService.isUserOfficialPartner(user)) {
            throw new IllegalArgumentException("VENDOR_OR_OFFICIAL_PARTNER_REQUIRED");
        }
        user.setPickupAuthorizedAt(authorized ? Instant.now() : null);
        user.setPickupAuthorizationNote(authorized ? trim(req != null ? req.note() : null, 500) : null);
        userRepository.save(user);
        if (authorized && (req == null || req.sendEmail() == null || Boolean.TRUE.equals(req.sendEmail()))) {
            emailService.sendAdminCapabilityGrantEmail(
                    user.getEmail(),
                    user.getDisplayName(),
                    resolveUserLocale(user, req != null ? req.locale() : null),
                    "pickup",
                    vendorBoostCreditService.countAvailable(user.getId()));
        }
        Map<UUID, Long> counts = loadTarantulaCountsForUsers(List.of(user.getId()));
        VendorRosterStats stats = loadVendorRosterStats(List.of(user.getId()));
        return ResponseEntity.ok(mapVendorDirectoryUser(user, counts, stats));
    }

    record SetPassportCreatorRequest(Boolean enabled) {}

    @PatchMapping("/users/{id}/passport-creator")
    public ResponseEntity<Map<String, Object>> setUserPassportCreator(@PathVariable UUID id,
                                                                      @RequestBody SetPassportCreatorRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        if (req == null || req.enabled() == null) {
            throw new IllegalArgumentException("ENABLED_REQUIRED");
        }
        userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        userCapabilitiesService.setPassportCreatorEnabled(id, req.enabled());
        User user = userRepository.findById(id).orElseThrow();
        return ResponseEntity.ok(Map.of(
                "userId", user.getId(),
                "passportCreatorEnabled", user.getPassportCreatorEnabledAt() != null,
                "studioActivated", user.getStudioActivatedAt() != null
        ));
    }

    record SetVerifiedOriginRequest(Boolean verified, String kind, Boolean sendEmail, String locale) {}

    @PatchMapping("/users/{id}/verified-origin")
    public ResponseEntity<Map<String, Object>> setUserVerifiedOrigin(@PathVariable UUID id,
                                                                      @RequestBody SetVerifiedOriginRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        boolean verified = req != null && Boolean.TRUE.equals(req.verified());
        if (verified) {
            VerifiedOriginKind kind = VerifiedOriginKind.fromString(req != null ? req.kind() : null);
            verifiedOriginService.grantVerifiedOrigin(id, kind);
        } else {
            verifiedOriginService.revokeVerifiedOrigin(id);
        }
        User user = userRepository.findById(id).orElseThrow();
        if (verified && (req == null || req.sendEmail() == null || Boolean.TRUE.equals(req.sendEmail()))) {
            emailService.sendAdminCapabilityGrantEmail(
                    user.getEmail(),
                    user.getDisplayName(),
                    resolveUserLocale(user, req != null ? req.locale() : null),
                    "origin",
                    vendorBoostCreditService.countAvailable(user.getId()));
        }
        Map<UUID, Long> counts = loadTarantulaCountsForUsers(List.of(user.getId()));
        VendorRosterStats stats = loadVendorRosterStats(List.of(user.getId()));
        return ResponseEntity.ok(mapVendorDirectoryUser(user, counts, stats));
    }

    @PostMapping("/users/{id}/boost-credits")
    public ResponseEntity<Map<String, Object>> grantUserBoostCredits(@PathVariable UUID id,
                                                                     @RequestBody(required = false) GrantBoostCreditsRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        User user = userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        int count = req != null && req.count() != null ? req.count() : 1;
        long available = vendorBoostCreditService.grantAdminCredits(user.getId(), count);
        if (req == null || req.sendEmail() == null || Boolean.TRUE.equals(req.sendEmail())) {
            emailService.sendAdminCapabilityGrantEmail(
                    user.getEmail(),
                    user.getDisplayName(),
                    resolveUserLocale(user, req != null ? req.locale() : null),
                    "boost",
                    available);
        }
        Map<UUID, Long> counts = loadTarantulaCountsForUsers(List.of(user.getId()));
        VendorRosterStats stats = loadVendorRosterStats(List.of(user.getId()));
        return ResponseEntity.ok(mapVendorDirectoryUser(user, counts, stats));
    }

    @GetMapping("/origin-verifications")
    public ResponseEntity<List<Map<String, Object>>> originVerifications(
            @RequestParam(required = false) String status) {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(verifiedOriginService.adminList(status));
    }

    @PatchMapping("/origin-verifications/{id}")
    public ResponseEntity<Map<String, Object>> reviewOriginVerification(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        adminAccessService.assertCurrentUserIsAdmin();
        String status = body != null ? body.get("status") : null;
        String note = body != null ? body.get("reviewerNote") : null;
        try {
            return ResponseEntity.ok(verifiedOriginService.adminReview(id, status, note));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Admin: list active vendors + optional pending invites; includes marketplace + billing hints for ops. */
    @GetMapping("/marketplace/sellers")
    public ResponseEntity<Map<String, Object>> marketplaceSellers(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "80") int limit,
            @RequestParam(defaultValue = "false") boolean vendorsOnly) {
        adminAccessService.assertCurrentUserIsAdmin();
        int cap = Math.min(Math.max(limit, 1), 200);
        String query = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        List<User> users;
        if (vendorsOnly) {
            users = new ArrayList<>(userRepository.findVerifiedBreedersForAdmin(PageRequest.of(0, cap)));
        } else {
            List<UUID> sellerIds = marketplaceListingRepository.findDistinctSellerUserIds();
            if (sellerIds.isEmpty()) {
                users = List.of();
            } else {
                users = userRepository.findAllById(sellerIds);
            }
        }
        if (!query.isEmpty()) {
            users = users.stream()
                    .filter(u -> matchesMarketplaceSellerQuery(u, query))
                    .collect(Collectors.toList());
        }
        users = users.stream().limit(cap).collect(Collectors.toList());
        List<UUID> ids = users.stream().map(User::getId).collect(Collectors.toList());
        Map<UUID, Long> spiderCounts = loadTarantulaCountsForUsers(ids);
        VendorRosterStats stats = loadVendorRosterStats(ids);
        List<Map<String, Object>> sellers = users.stream()
                .map(u -> mapMarketplaceSellerRow(u, spiderCounts, stats))
                .collect(Collectors.toList());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("sellers", sellers);
        body.put("limit", cap);
        body.put("vendorsOnly", vendorsOnly);
        return ResponseEntity.ok(body);
    }

    private static boolean matchesMarketplaceSellerQuery(User u, String queryNorm) {
        if (u == null || queryNorm.isBlank()) {
            return true;
        }
        String email = u.getEmail() == null ? "" : u.getEmail().toLowerCase(Locale.ROOT);
        String name = u.getDisplayName() == null ? "" : u.getDisplayName().toLowerCase(Locale.ROOT);
        String handle = u.getPublicHandle() == null ? "" : u.getPublicHandle().toLowerCase(Locale.ROOT);
        String storefront = u.getStorefrontName() == null ? "" : u.getStorefrontName().toLowerCase(Locale.ROOT);
        return email.contains(queryNorm)
                || name.contains(queryNorm)
                || handle.contains(queryNorm)
                || storefront.contains(queryNorm);
    }

    private Map<String, Object> mapMarketplaceSellerRow(User u, Map<UUID, Long> spiderCounts, VendorRosterStats stats) {
        Map<String, Object> out = mapVendorDirectoryUser(u, spiderCounts, stats);
        @SuppressWarnings("unchecked")
        Map<String, Object> totals = (Map<String, Object>) out.getOrDefault("marketplaceListingTotals", Map.of());
        out.put("activeListingsCount", totals.getOrDefault("active", 0L));
        out.put("totalListingsCount", totals.getOrDefault("all", 0L));
        out.put("storefrontName", u.getStorefrontName() == null ? "" : u.getStorefrontName());
        out.put("sellerProgram", marketplaceService.resolveSellerProgram(u));
        return out;
    }

    @GetMapping("/vendor-users")
    public ResponseEntity<Map<String, Object>> vendorUsers(
            @RequestParam(defaultValue = "100") int limit,
            @RequestParam(defaultValue = "true") boolean includePendingInvites) {
        adminAccessService.assertCurrentUserIsAdmin();
        int cap = Math.min(Math.max(limit, 1), 500);
        List<User> users = userRepository.findVerifiedBreedersForAdmin(PageRequest.of(0, cap));
        List<User> pending = includePendingInvites
                ? userRepository.findPendingVendorInvites(Instant.now(), PageRequest.of(0, cap))
                : List.of();
        List<UUID> allIds = new ArrayList<>();
        for (User u : users) {
            allIds.add(u.getId());
        }
        for (User u : pending) {
            allIds.add(u.getId());
        }
        Map<UUID, Long> counts = loadTarantulaCountsForUsers(allIds.stream().distinct().collect(Collectors.toList()));
        VendorRosterStats stats = loadVendorRosterStats(allIds.stream().distinct().collect(Collectors.toList()));
        List<Map<String, Object>> rows = users.stream()
                .map(u -> mapVendorDirectoryUser(u, counts, stats))
                .collect(Collectors.toList());
        List<Map<String, Object>> pendingRows = pending.stream()
                .map(u -> mapVendorDirectoryUser(u, counts, stats))
                .collect(Collectors.toList());
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("users", rows);
        body.put("pendingInvites", pendingRows);
        body.put("totalVendors", userRepository.countByVerifiedBreederTrue());
        body.put("totalPendingInvites", includePendingInvites
                ? userRepository.countPendingVendorInvitesNonExpired(Instant.now())
                : 0L);
        body.put("limit", cap);
        return ResponseEntity.ok(body);
    }

    @PostMapping("/users/{id}/vendor-invite")
    public ResponseEntity<Map<String, Object>> sendVendorInvite(@PathVariable UUID id,
                                                                 @RequestBody(required = false) VendorInviteSendRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        User user = vendorInviteService.sendInvite(id, req == null ? null : req.locale());
        Map<UUID, Long> counts = loadTarantulaCountsForUsers(List.of(user.getId()));
        VendorRosterStats stats = loadVendorRosterStats(List.of(user.getId()));
        return ResponseEntity.ok(mapVendorDirectoryUser(user, counts, stats));
    }

    @PostMapping("/users/{id}/vendor-invite/revoke")
    public ResponseEntity<Map<String, Object>> revokeVendorInvite(@PathVariable UUID id) {
        adminAccessService.assertCurrentUserIsAdmin();
        vendorInviteService.revokeInvite(id);
        User user = userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        Map<UUID, Long> counts = loadTarantulaCountsForUsers(List.of(user.getId()));
        VendorRosterStats stats = loadVendorRosterStats(List.of(user.getId()));
        return ResponseEntity.ok(mapVendorDirectoryUser(user, counts, stats));
    }

    /** Admin: lookup a single user by email (case-insensitive) so vendor activation works without scrolling the recent list. */
    @GetMapping("/user-lookup")
    public ResponseEntity<Map<String, Object>> userLookup(@RequestParam("email") String email) {
        adminAccessService.assertCurrentUserIsAdmin();
        String e = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
        if (e.isEmpty()) {
            throw new IllegalArgumentException("EMAIL_REQUIRED");
        }
        User user = userRepository.findByEmail(e).orElse(null);
        Map<String, Object> body = new LinkedHashMap<>();
        if (user == null) {
            body.put("found", false);
            return ResponseEntity.ok(body);
        }
        Map<UUID, Long> counts = loadTarantulaCountsForUsers(List.of(user.getId()));
        VendorRosterStats stats = loadVendorRosterStats(List.of(user.getId()));
        body.put("found", true);
        body.put("user", mapVendorDirectoryUser(user, counts, stats));
        return ResponseEntity.ok(body);
    }

    @PatchMapping("/users/{id}/plan")
    public ResponseEntity<Map<String, Object>> adminSetUserPlan(@PathVariable UUID id,
                                                                @RequestBody(required = false) AdminSetPlanRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        User user = userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        if (req != null && req.plan() != null && !req.plan().isBlank()) {
            user.setPlan(UserPlan.valueOf(req.plan().trim().toUpperCase(Locale.ROOT)));
        }
        boolean wantsExtension = req != null && req.extendTrialDays() != null && req.extendTrialDays() > 0;
        if (wantsExtension) {
            String reason = req.reason() == null ? "" : req.reason().trim();
            if (reason.isEmpty()) {
                throw new IllegalArgumentException("ADMIN_GRANT_REASON_REQUIRED");
            }
            // recordGrant persists the user (with new trial_ends_at) and sends the localized email.
            userRepository.save(user);
            UUID adminId = securityHelper.getCurrentUserId();
            proDayGrantService.recordGrant(user, req.extendTrialDays(), ProDayGrantSource.ADMIN, reason, adminId);
        } else {
            userRepository.save(user);
        }
        Map<UUID, Long> counts = loadTarantulaCountsForUsers(List.of(user.getId()));
        VendorRosterStats stats = loadVendorRosterStats(List.of(user.getId()));
        return ResponseEntity.ok(mapVendorDirectoryUser(user, counts, stats));
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
        User provisioned = userRepository.findById(result.user().getId()).orElse(result.user());
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("user", mapBetaTester(provisioned));
        out.put("created", result.created());
        if (gen) {
            out.put("plainPassword", result.plainPassword());
        }
        return ResponseEntity.ok(out);
    }

    /**
     * Sends the beta welcome email using credentials just produced by provision (admin-only).
     * Plain password must be supplied by the client session that received it from provision.
     */
    @PostMapping("/users/{id}/send-beta-welcome-email")
    public ResponseEntity<Map<String, Object>> adminSendBetaWelcomeEmail(@PathVariable UUID id,
                                                                         @RequestBody SendBetaWelcomeEmailRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        if (req.plainPassword() == null || req.plainPassword().isBlank()) {
            throw new IllegalArgumentException("PLAIN_PASSWORD_REQUIRED");
        }
        User user = userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        if (!Boolean.TRUE.equals(user.getIsBetaTester())) {
            throw new IllegalArgumentException("USER_NOT_BETA_TESTER");
        }
        String localeNorm = BetaMailBodies.normalizeLocale(req.locale());
        String greetingName = user.getDisplayName();
        if (greetingName == null || greetingName.isBlank()) {
            String em = user.getEmail();
            int at = em.indexOf('@');
            greetingName = at > 0 ? em.substring(0, at) : em;
        }
        Map<String, Object> out = new LinkedHashMap<>();
        try {
            emailService.sendBetaWelcomeEmail(user.getEmail(), greetingName, req.plainPassword(), localeNorm);
            recordBetaEmailSent(user.getId(), "welcome", localeNorm);
            out.put("welcomeEmailSent", true);
        } catch (Exception e) {
            out.put("welcomeEmailSent", false);
            out.put("welcomeEmailError", e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
        }
        return ResponseEntity.ok(out);
    }

    private static final Set<String> OUTREACH_EMAIL_TEMPLATE_KEYS = Set.of(
            "play_early_access_web",
            "vendor_welcome_mx"
    );

    /**
     * Sends a program outreach template to any registered user (not gated on beta tester).
     * {@code templateKey}: currently only {@code play_early_access_web}.
     */
    @PostMapping("/users/{id}/send-outreach-email")
    public ResponseEntity<Map<String, Object>> adminSendOutreachEmail(@PathVariable UUID id,
                                                                       @Valid @RequestBody SendOutreachEmailRequest req) {
        adminAccessService.assertCurrentUserIsAdmin();
        String key = req.templateKey() == null ? "" : req.templateKey().trim().toLowerCase();
        if (!OUTREACH_EMAIL_TEMPLATE_KEYS.contains(key) || !BetaMailBodies.isBatchCampaignKey(key)) {
            throw new IllegalArgumentException("INVALID_OUTREACH_TEMPLATE");
        }
        User user = userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        String loc = BetaMailBodies.normalizeLocale(req.locale());
        String greetingName = user.getDisplayName();
        if (greetingName == null || greetingName.isBlank()) {
            String em = user.getEmail();
            int at = em.indexOf('@');
            greetingName = at > 0 ? em.substring(0, at) : em;
        }
        Map<String, Object> out = new LinkedHashMap<>();
        try {
            emailService.sendBetaCampaignEmail(user.getEmail(), greetingName, key, loc);
            recordBetaEmailSent(user.getId(), key, loc);
            out.put("sent", true);
        } catch (Exception e) {
            out.put("sent", false);
            out.put("error", e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
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
        boolean approvedViaProvision = false;
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
                approvedViaProvision = true;
                plainPassword = res.plainPassword();
                approvedUser = res.user();
            }
            copyBetaApplicationMetadataToUser(approvedUser, app);
            userRepository.save(approvedUser);
            app.setApprovedUserId(approvedUser.getId());
        }
        betaApplicationRepository.save(app);
        if ("approve".equals(action) && approvedUser != null && !approvedViaProvision) {
            googleGroupSyncAsyncInvoker.scheduleAfterCommitOrNow(approvedUser.getId());
        }
        if (approvedUser != null) {
            approvedUser = userRepository.findById(approvedUser.getId()).orElse(approvedUser);
        }
        Map<String, Object> out = new LinkedHashMap<>(mapBetaApplication(app));
        if (plainPassword != null) {
            out.put("plainPassword", plainPassword);
        }
        if (approvedUser != null) {
            out.put("approvedUser", mapBetaTester(approvedUser));
        }
        if ("approve".equals(action) && Boolean.TRUE.equals(req.sendWelcomeEmail()) && approvedUser != null) {
            if (plainPassword != null && !plainPassword.isBlank()) {
                try {
                    String greetingName = approvedUser.getDisplayName();
                    if (greetingName == null || greetingName.isBlank()) {
                        greetingName = app.getName();
                    }
                    String welcomeLoc = resolveWelcomeLocaleForApplication(app, req.welcomeLocale());
                    emailService.sendBetaWelcomeEmail(
                            approvedUser.getEmail(),
                            greetingName,
                            plainPassword,
                            welcomeLoc);
                    recordBetaEmailSent(approvedUser.getId(), "welcome", BetaMailBodies.normalizeLocale(welcomeLoc));
                    out.put("welcomeEmailSent", true);
                } catch (Exception e) {
                    out.put("welcomeEmailSent", false);
                    out.put("welcomeEmailError", e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
                }
            } else {
                out.put("welcomeEmailSent", false);
                out.put("welcomeEmailSkippedReason", "NO_PLAIN_PASSWORD");
            }
        }
        return ResponseEntity.ok(out);
    }

    private void recordBetaEmailSent(UUID userId, String campaignKey, String locale) {
        BetaEmailSend row = new BetaEmailSend();
        row.setUserId(userId);
        row.setCampaignKey(campaignKey);
        row.setLocale(locale);
        betaEmailSendRepository.save(row);
    }

    private void enrichBetaCampaignSummaries(List<Map<String, Object>> rows, List<UUID> userIds) {
        if (userIds.isEmpty()) {
            return;
        }
        List<BetaEmailSend> all = betaEmailSendRepository.findByUserIdIn(userIds);
        Map<UUID, Map<String, LocalDateTime>> latest = new HashMap<>();
        for (BetaEmailSend s : all) {
            latest.computeIfAbsent(s.getUserId(), k -> new HashMap<>());
            Map<String, LocalDateTime> m = latest.get(s.getUserId());
            LocalDateTime prev = m.get(s.getCampaignKey());
            if (prev == null || s.getSentAt().isAfter(prev)) {
                m.put(s.getCampaignKey(), s.getSentAt());
            }
        }
        for (Map<String, Object> row : rows) {
            UUID id = (UUID) row.get("id");
            Map<String, LocalDateTime> m = latest.getOrDefault(id, Map.of());
            Map<String, String> iso = new LinkedHashMap<>();
            for (var e : m.entrySet()) {
                iso.put(e.getKey(), e.getValue().toString());
            }
            row.put("betaCampaignSends", iso);
        }
    }

    private record VendorRosterStats(
            Map<UUID, Map<String, Long>> listingCountsByStatusLower,
            Map<UUID, Map<String, Long>> activeListingCountsByCategory,
            Map<UUID, Subscription> latestSubscriptionByUserId,
            Map<UUID, Long> boostCreditCountsByUserId
    ) {
        static VendorRosterStats empty() {
            return new VendorRosterStats(Map.of(), Map.of(), Map.of(), Map.of());
        }
    }

    private VendorRosterStats loadVendorRosterStats(List<UUID> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return VendorRosterStats.empty();
        }
        List<UUID> ids = userIds.stream().distinct().collect(Collectors.toList());
        Map<UUID, Map<String, Long>> byStatus = new HashMap<>();
        for (Object[] row : marketplaceListingRepository.countBySellerGroupedByStatusLower(ids)) {
            UUID sid = parseUuidRow(row[0]);
            if (sid == null) {
                continue;
            }
            String st = row[1] == null ? "" : String.valueOf(row[1]).toLowerCase(Locale.ROOT);
            long c = row[2] instanceof Number num ? num.longValue() : 0L;
            byStatus.computeIfAbsent(sid, k -> new LinkedHashMap<>()).merge(st, c, Long::sum);
        }
        Map<UUID, Map<String, Long>> byCat = new HashMap<>();
        for (Object[] row : marketplaceListingRepository.countActiveBySellerGroupedByCategory(ids)) {
            UUID sid = parseUuidRow(row[0]);
            if (sid == null) {
                continue;
            }
            String cat = row[1] == null ? "unknown" : String.valueOf(row[1]);
            long c = row[2] instanceof Number num ? num.longValue() : 0L;
            byCat.computeIfAbsent(sid, k -> new LinkedHashMap<>()).merge(cat, c, Long::sum);
        }
        Map<UUID, Subscription> latestSub = new HashMap<>();
        for (Subscription s : subscriptionRepository.findByUserIdIn(ids)) {
            latestSub.merge(s.getUserId(), s, (a, b) -> {
                LocalDateTime ac = a.getCreatedAt();
                LocalDateTime bc = b.getCreatedAt();
                if (ac == null) {
                    return b;
                }
                if (bc == null) {
                    return a;
                }
                return ac.isAfter(bc) ? a : b;
            });
        }
        Map<UUID, Long> boostCredits = vendorBoostCreditService.countAvailable(ids);
        return new VendorRosterStats(byStatus, byCat, latestSub, boostCredits);
    }

    private Map<String, Object> mapVendorDirectoryUser(User u, Map<UUID, Long> spiderCounts, VendorRosterStats stats) {
        Map<String, Object> out = mapUser(u, spiderCounts);
        out.put("vendorBoostCreditsAvailable", stats.boostCreditCountsByUserId().getOrDefault(u.getId(), 0L));
        putVendorDirectoryMetrics(out, u, stats);
        return out;
    }

    private void putVendorDirectoryMetrics(Map<String, Object> out, User u, VendorRosterStats stats) {
        UUID uid = u.getId();
        Map<String, Long> st = new LinkedHashMap<>(
                stats.listingCountsByStatusLower().getOrDefault(uid, Map.of()));
        long active = st.getOrDefault("active", 0L);
        long sold = st.getOrDefault("sold", 0L);
        long reserved = st.getOrDefault("reserved", 0L);
        long hidden = st.getOrDefault("hidden", 0L);
        long draft = st.getOrDefault("draft", 0L);
        long allListings = st.values().stream().mapToLong(Long::longValue).sum();
        out.put("marketplaceListingCountsByStatus", st);
        Map<String, Object> totals = new LinkedHashMap<>();
        totals.put("all", allListings);
        totals.put("active", active);
        totals.put("sold", sold);
        totals.put("reserved", reserved);
        totals.put("hidden", hidden);
        totals.put("draft", draft);
        out.put("marketplaceListingTotals", totals);
        Map<String, Long> cats = new LinkedHashMap<>(
                stats.activeListingCountsByCategory().getOrDefault(uid, Map.of()));
        out.put("activeListingsByCategory", cats);
        long distinctActiveCategories = cats.entrySet().stream()
                .filter(e -> e.getValue() != null && e.getValue() > 0)
                .count();
        if (distinctActiveCategories > 1) {
            out.put("inventoryMix", "multi_category");
        } else if (distinctActiveCategories == 1) {
            out.put("inventoryMix", "single_category");
        } else {
            out.put("inventoryMix", "empty");
        }
        out.put("vendorChannel", "peer");
        out.put("listingViewsTracked", false);
        Subscription sub = stats.latestSubscriptionByUserId().get(uid);
        if (sub != null) {
            Map<String, Object> sm = new LinkedHashMap<>();
            sm.put("status", sub.getStatus() == null ? "" : sub.getStatus());
            sm.put("currentPeriodEnd", sub.getCurrentPeriodEnd());
            sm.put("cancelAtPeriodEnd", Boolean.TRUE.equals(sub.getCancelAtPeriodEnd()));
            sm.put("provider", sub.getProvider() == null ? "" : sub.getProvider());
            out.put("stripeSubscription", sm);
        } else {
            out.put("stripeSubscription", null);
        }
        List<String> hints = new ArrayList<>();
        if (active == 0) {
            hints.add("no_active_listings");
        }
        if (sold > 0 && active == 0) {
            hints.add("sold_out_or_only_completed");
        }
        if (u.getPublicHandle() == null || u.getPublicHandle().isBlank()) {
            hints.add("no_store_handle");
        }
        if (u.getStorefrontName() == null || u.getStorefrontName().isBlank()) {
            hints.add("no_storefront_name");
        }
        if (u.getStorefrontShippingPolicy() == null || u.getStorefrontShippingPolicy().isBlank()) {
            hints.add("no_shipping_policy");
        }
        if (u.getStorefrontLagPolicy() == null || u.getStorefrontLagPolicy().isBlank()) {
            hints.add("no_handling_policy");
        }
        if (u.getContactWhatsapp() == null || u.getContactWhatsapp().isBlank()) {
            hints.add("no_whatsapp");
        }
        if (!planAccessService.hasProFeatures(u) && u.getPlan() != UserPlan.PRO) {
            hints.add("free_plan_or_trial_expired");
        }
        if (sub != null && Boolean.TRUE.equals(sub.getCancelAtPeriodEnd())) {
            hints.add("subscription_cancel_at_period_end");
        }
        if (sub != null && sub.getStatus() != null && "canceled".equalsIgnoreCase(sub.getStatus())) {
            hints.add("subscription_canceled");
        }
        out.put("opportunityHints", hints);
    }

    private Map<String, Object> mapUser(User u, Map<UUID, Long> spiderCounts) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", u.getId());
        out.put("email", u.getEmail());
        out.put("displayName", u.getDisplayName() == null ? "" : u.getDisplayName());
        out.put("publicHandle", u.getPublicHandle() == null ? "" : u.getPublicHandle());
        putPlanAccessFields(u, out);
        out.put("isBetaTester", Boolean.TRUE.equals(u.getIsBetaTester()));
        out.put("marketingOps", Boolean.TRUE.equals(u.getIsMarketingOps()));
        out.put("verifiedBreeder", Boolean.TRUE.equals(u.getVerifiedBreeder()));
        out.put("verifiedBreederAt", u.getVerifiedBreederAt());
        boolean storefrontVerified = isStorefrontVerified(u);
        out.put("verifiedOrigin", VerifiedOriginService.isVerified(u));
        out.put("origin", verifiedOriginService.toPublicMap(u));
        out.put("storefrontVerified", storefrontVerified);
        out.put("storefrontVerifiedAt", storefrontVerified
                ? (u.getVerifiedOriginAt() != null ? u.getVerifiedOriginAt() : u.getStorefrontVerifiedAt())
                : null);
        out.put("pickupAuthorized", u.getPickupAuthorizedAt() != null);
        out.put("pickupAuthorizedAt", u.getPickupAuthorizedAt());
        out.put("pickupAuthorizationNote", u.getPickupAuthorizationNote() == null ? "" : u.getPickupAuthorizationNote());
        out.put("vendorInviteSentAt", u.getVendorInviteSentAt());
        out.put("vendorInviteExpiresAt", u.getVendorInviteExpiresAt());
        boolean invitePending = u.getVendorInviteToken() != null
                && !Boolean.TRUE.equals(u.getVerifiedBreeder())
                && u.getVendorInviteExpiresAt() != null
                && u.getVendorInviteExpiresAt().isAfter(Instant.now());
        out.put("vendorInvitePending", invitePending);
        out.put("officialPartner", officialVendorService.isUserOfficialPartner(u));
        out.put("tarantulasCount", spiderCounts.getOrDefault(u.getId(), 0L));
        out.put("createdAt", u.getCreatedAt());
        out.put("lastActivityAt", u.getLastActivityAt());
        out.put("googleGroupSyncStatus", u.getGoogleGroupSyncStatus() == null ? "" : u.getGoogleGroupSyncStatus());
        out.put("googleGroupSyncLastError", u.getGoogleGroupSyncLastError() == null ? "" : u.getGoogleGroupSyncLastError());
        return out;
    }

    private static boolean isStorefrontVerified(User user) {
        if (user == null) {
            return false;
        }
        if (user.getStorefrontVerifiedAt() != null) {
            return true;
        }
        if (user.getVerifiedOriginAt() == null || user.getVerifiedOriginKind() == null) {
            return false;
        }
        try {
            VerifiedOriginKind kind = VerifiedOriginKind.fromString(user.getVerifiedOriginKind());
            return kind == VerifiedOriginKind.VENDOR || kind == VerifiedOriginKind.STORE;
        } catch (RuntimeException ignored) {
            return false;
        }
    }

    private static String resolveUserLocale(User user, String requestedLocale) {
        if (requestedLocale != null && !requestedLocale.isBlank()) {
            return BetaMailBodies.normalizeLocale(requestedLocale);
        }
        if (user != null && user.getPreferredLocale() != null && !user.getPreferredLocale().isBlank()) {
            return BetaMailBodies.normalizeLocale(user.getPreferredLocale());
        }
        if (user != null && user.getBetaPreferredLocale() != null && !user.getBetaPreferredLocale().isBlank()) {
            return BetaMailBodies.normalizeLocale(user.getBetaPreferredLocale());
        }
        return "es";
    }

    /** One round-trip for admin lists; native SQL counts rows in {@code tarantulas} per owner. */
    private Map<UUID, Long> loadTarantulaCountsForUsers(List<UUID> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }
        List<UUID> ids = userIds.stream().distinct().collect(Collectors.toList());
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<UUID, Long> out = new HashMap<>();
        for (Object[] row : tarantulaRepository.countGroupedByUserIdsNative(ids)) {
            UUID uid = parseUuidRow(row[0]);
            if (uid == null) {
                continue;
            }
            long n = 0L;
            if (row[1] instanceof Number num) {
                n = num.longValue();
            }
            out.put(uid, n);
        }
        return out;
    }

    private static UUID parseUuidRow(Object raw) {
        if (raw instanceof UUID u) {
            return u;
        }
        if (raw instanceof String s && !s.isBlank()) {
            try {
                return UUID.fromString(s.trim());
            } catch (IllegalArgumentException ignored) {
                return null;
            }
        }
        return null;
    }

    private void putPlanAccessFields(User u, Map<String, Object> out) {
        out.put("plan", u.getPlan() == null ? "FREE" : u.getPlan().name());
        out.put("inTrial", planAccessService.isTrialActive(u));
        out.put("trialEndsAt", u.getTrialEndsAt());
        out.put("hasProFeatures", planAccessService.hasProFeatures(u));
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
        return mapBetaTester(user, null, null);
    }

    private Map<String, Object> mapBetaTester(User user, Map<UUID, Long> spiderCounts) {
        return mapBetaTester(user, spiderCounts, null);
    }

    /**
     * {@code betaDevicesByUserId}: when non-null, devices text from the approved beta application(s)
     * for that user (batch map). When null, resolves with one DB read (single-user admin responses).
     */
    private Map<String, Object> mapBetaTester(User user, Map<UUID, Long> spiderCounts,
                                              Map<UUID, String> betaDevicesByUserId) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", user.getId());
        out.put("email", user.getEmail());
        out.put("displayName", user.getDisplayName() == null ? "" : user.getDisplayName());
        putPlanAccessFields(user, out);
        out.put("betaCohort", user.getBetaCohort() == null ? "" : user.getBetaCohort());
        out.put("betaCountry", user.getBetaCountry() == null ? "" : user.getBetaCountry());
        out.put("betaExperienceLevel", user.getBetaExperienceLevel() == null ? "" : user.getBetaExperienceLevel());
        out.put("betaPreferredLocale", user.getBetaPreferredLocale() == null ? "" : user.getBetaPreferredLocale());
        out.put("isBetaTester", Boolean.TRUE.equals(user.getIsBetaTester()));
        out.put("verifiedBreeder", Boolean.TRUE.equals(user.getVerifiedBreeder()));
        out.put("verifiedBreederAt", user.getVerifiedBreederAt());
        out.put("storefrontVerified", user.getStorefrontVerifiedAt() != null);
        out.put("storefrontVerifiedAt", user.getStorefrontVerifiedAt());
        out.put("createdAt", user.getCreatedAt());
        out.put("lastActivityAt", user.getLastActivityAt());
        long spiders = spiderCounts != null
                ? spiderCounts.getOrDefault(user.getId(), 0L)
                : tarantulaRepository.countForUserId(user.getId());
        out.put("tarantulasCount", spiders);
        out.put("bugReportsCount", bugReportRepository.countByUserId(user.getId()));
        String betaDevices;
        if (betaDevicesByUserId != null) {
            betaDevices = betaDevicesByUserId.getOrDefault(user.getId(), "");
        } else {
            betaDevices = betaApplicationRepository
                    .findTopByApprovedUserIdAndStatusOrderByReviewedAtDesc(user.getId(), "approved")
                    .map(a -> a.getDevices() != null ? a.getDevices() : "")
                    .orElse("");
        }
        out.put("betaDevices", betaDevices);
        out.put("googleGroupSyncStatus", user.getGoogleGroupSyncStatus() == null ? "" : user.getGoogleGroupSyncStatus());
        out.put("googleGroupSyncLastError",
                user.getGoogleGroupSyncLastError() == null ? "" : user.getGoogleGroupSyncLastError());
        return out;
    }

    /** Latest reviewed approved application per user (devices field from the beta apply form). */
    private Map<UUID, String> loadBetaDevicesForApprovedUsers(List<UUID> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }
        List<UUID> distinct = userIds.stream().distinct().collect(Collectors.toList());
        List<BetaApplication> apps = betaApplicationRepository.findByApprovedUserIdInAndStatus(distinct, "approved");
        Map<UUID, BetaApplication> best = new HashMap<>();
        for (BetaApplication app : apps) {
            UUID uid = app.getApprovedUserId();
            if (uid == null) {
                continue;
            }
            best.merge(uid, app, (older, newer) -> {
                LocalDateTime a = older.getReviewedAt();
                LocalDateTime b = newer.getReviewedAt();
                if (b == null) {
                    return older;
                }
                if (a == null) {
                    return newer;
                }
                return b.isAfter(a) ? newer : older;
            });
        }
        Map<UUID, String> out = new HashMap<>();
        for (Map.Entry<UUID, BetaApplication> e : best.entrySet()) {
            String d = e.getValue().getDevices();
            out.put(e.getKey(), d != null ? d : "");
        }
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
        out.put("preferredLocale", app.getPreferredLocale() == null ? "" : app.getPreferredLocale());
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

    private void copyBetaApplicationMetadataToUser(User user, BetaApplication app) {
        if (user == null || app == null) {
            return;
        }
        if (user.getBetaCountry() == null || user.getBetaCountry().isBlank()) {
            user.setBetaCountry(trim(app.getCountry(), 80));
        }
        if (user.getBetaExperienceLevel() == null || user.getBetaExperienceLevel().isBlank()) {
            user.setBetaExperienceLevel(trim(app.getExperienceLevel(), 40));
        }
        if (user.getBetaPreferredLocale() == null || user.getBetaPreferredLocale().isBlank()) {
            String pl = app.getPreferredLocale();
            if (pl != null && !pl.isBlank()) {
                user.setBetaPreferredLocale(BetaMailBodies.normalizeLocale(pl));
            }
        }
    }

    private static String resolveWelcomeLocaleForApplication(BetaApplication app, String adminWelcomeLocale) {
        if (app != null && app.getPreferredLocale() != null && !app.getPreferredLocale().isBlank()) {
            return app.getPreferredLocale();
        }
        return adminWelcomeLocale;
    }

    @GetMapping("/marketing/tap-to-contact-rate")
    public ResponseEntity<Map<String, Object>> tapToContactRate() {
        adminAccessService.assertCurrentUserCanUseMarketingTools();
        return ResponseEntity.ok(listingEventService.getNetworkTapToContactRate());
    }

    @GetMapping("/marketing/partner-listing-events")
    public ResponseEntity<Map<String, Object>> partnerListingEvents() {
        adminAccessService.assertCurrentUserCanUseMarketingTools();
        return ResponseEntity.ok(listingEventService.getPartnerListingEventTotals());
    }

    @GetMapping("/marketing/listing-counts")
    public ResponseEntity<Map<String, Object>> listingCounts() {
        adminAccessService.assertCurrentUserIsAdmin();
        long peerActive = marketplaceListingRepository.countByStatusIgnoreCase("active");
        long partnerActive = partnerListingRepository.countByStatus(
                com.tarantulapp.entity.PartnerListingStatus.ACTIVE);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("peerActive", peerActive);
        out.put("partnerActive", partnerActive);
        out.put("total", peerActive + partnerActive);
        return ResponseEntity.ok(out);
    }

    @GetMapping("/marketing/top-vendors/live")
    public ResponseEntity<List<Map<String, Object>>> liveTopVendors(
            @RequestParam(defaultValue = "3") int limit) {
        adminAccessService.assertCurrentUserIsAdmin();
        return ResponseEntity.ok(topVendorService.getLiveTopVendors(limit));
    }

    @GetMapping("/marketing/top-vendors/history")
    public ResponseEntity<List<Map<String, Object>>> topVendorHistory(
            @RequestParam(required = false) String month) {
        adminAccessService.assertCurrentUserIsAdmin();
        if (month != null && !month.isBlank()) {
            return ResponseEntity.ok(topVendorService.getHistoryForMonth(month));
        }
        return ResponseEntity.ok(topVendorService.getLatestSnapshot());
    }
}
