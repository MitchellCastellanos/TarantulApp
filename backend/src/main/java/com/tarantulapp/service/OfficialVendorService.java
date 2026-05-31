package com.tarantulapp.service;

import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.entity.OfficialVendorLead;
import com.tarantulapp.entity.User;
import com.tarantulapp.entity.PartnerListingStatus;
import com.tarantulapp.entity.PartnerProgramTier;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.util.BetaMailBodies;
import com.tarantulapp.util.FileStorageService;
import com.tarantulapp.util.PartnerCheckoutConfig;
import com.tarantulapp.util.RegionPolicy;
import com.tarantulapp.entity.PartnerListingSyncRun;
import com.tarantulapp.entity.PartnerListingSyncRunStatus;
import com.tarantulapp.repository.OfficialVendorLeadRepository;
import com.tarantulapp.repository.OfficialVendorRepository;
import com.tarantulapp.repository.PartnerListingRepository;
import com.tarantulapp.repository.PartnerListingSyncRunRepository;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.service.vendors.PartnerListingCatalogRules;
import com.tarantulapp.service.vendors.PartnerReadinessReportService;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class OfficialVendorService {
    private static final Logger log = LoggerFactory.getLogger(OfficialVendorService.class);

    private final OfficialVendorRepository officialVendorRepository;
    private final OfficialVendorLeadRepository officialVendorLeadRepository;
    private final PartnerListingRepository partnerListingRepository;
    private final PartnerListingSyncRunRepository partnerListingSyncRunRepository;
    private final PartnerHandoffAnalyticsService partnerHandoffAnalyticsService;
    private final PartnerReadinessReportService partnerReadinessReportService;
    private final EmailService emailService;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final String appBaseUrl;
    private final boolean seedOnStartup;

    public OfficialVendorService(OfficialVendorRepository officialVendorRepository,
                                 OfficialVendorLeadRepository officialVendorLeadRepository,
                                 PartnerListingRepository partnerListingRepository,
                                 PartnerListingSyncRunRepository partnerListingSyncRunRepository,
                                 PartnerHandoffAnalyticsService partnerHandoffAnalyticsService,
                                 PartnerReadinessReportService partnerReadinessReportService,
                                 EmailService emailService,
                                 UserRepository userRepository,
                                 FileStorageService fileStorageService,
                                 @Value("${app.base-url:http://localhost:5173}") String appBaseUrl,
                                 @Value("${app.official-vendors.seed-on-startup:false}") boolean seedOnStartup) {
        this.officialVendorRepository = officialVendorRepository;
        this.officialVendorLeadRepository = officialVendorLeadRepository;
        this.partnerListingRepository = partnerListingRepository;
        this.partnerListingSyncRunRepository = partnerListingSyncRunRepository;
        this.partnerHandoffAnalyticsService = partnerHandoffAnalyticsService;
        this.partnerReadinessReportService = partnerReadinessReportService;
        this.emailService = emailService;
        this.userRepository = userRepository;
        this.fileStorageService = fileStorageService;
        this.appBaseUrl = trimTrailingSlash(appBaseUrl);
        this.seedOnStartup = seedOnStartup;
    }

    @PostConstruct
    @Transactional
    public void seedDefaults() {
        if (!seedOnStartup) return;
        try {
            ensureSeedData();
        } catch (Exception ex) {
            // No tumbar todo el backend por seed cuando la BD está saturada/intermitente.
            log.warn("Skipping official vendor seed on startup: {}", ex.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listOfficialVendors(String q,
                                                         String country,
                                                         String state,
                                                         String city,
                                                         String nearCountry,
                                                         String nearState,
                                                         String nearCity) {
        final String queryNorm = normalize(q);
        final String countryNorm = normalize(country);
        final String stateNorm = normalize(state);
        final String cityNorm = normalize(city);
        final String nearCountryNorm = normalize(nearCountry);
        final String nearStateNorm = normalize(nearState);
        final String nearCityNorm = normalize(nearCity);

        return officialVendorRepository.findByEnabledTrueOrderByInfluenceScoreDescNameAsc().stream()
                .map(this::mapVendor)
                .filter(v -> queryNorm == null || vendorMatchesQuery(v, queryNorm))
                .filter(v -> countryNorm == null || normalize((String) v.get("country")).equals(countryNorm))
                .filter(v -> stateNorm == null || normalize((String) v.get("state")).equals(stateNorm))
                .filter(v -> cityNorm == null || normalize((String) v.get("city")).equals(cityNorm))
                .sorted((a, b) -> Integer.compare(
                        rankVendor(b, nearCountryNorm, nearStateNorm, nearCityNorm),
                        rankVendor(a, nearCountryNorm, nearStateNorm, nearCityNorm)))
                .limit(50)
                .collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> submitVendorLead(String businessName, String contactName, String contactEmail,
                                                String websiteUrl, String country, String state, String city,
                                                String shippingScope, String note) {
        OfficialVendorLead lead = new OfficialVendorLead();
        lead.setBusinessName(cleanText(businessName, 140));
        lead.setContactName(cleanText(contactName, 120));
        lead.setContactEmail(cleanText(contactEmail, 255));
        lead.setWebsiteUrl(cleanText(websiteUrl, 350));
        lead.setCountry(cleanText(country, 80));
        lead.setState(cleanText(state, 80));
        lead.setCity(cleanText(city, 80));
        lead.setShippingScope(cleanText(shippingScope, 80));
        lead.setNote(cleanText(note, 1200));
        lead.setStatus("open");
        if (lead.getBusinessName() == null || lead.getContactEmail() == null) {
            throw new IllegalArgumentException("Nombre de negocio y email son requeridos");
        }
        return mapLead(officialVendorLeadRepository.save(lead));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> adminListVendors() {
        Instant since30d = Instant.now().minus(30, ChronoUnit.DAYS);
        Map<UUID, Map<String, Object>> handoffs30d = partnerHandoffAnalyticsService.adminHandoffByVendorSince(since30d);
        return officialVendorRepository.findAll().stream()
                .sorted((a, b) -> {
                    int scoreCompare = Integer.compare(
                            b.getInfluenceScore() == null ? 0 : b.getInfluenceScore(),
                            a.getInfluenceScore() == null ? 0 : a.getInfluenceScore());
                    if (scoreCompare != 0) return scoreCompare;
                    return (a.getName() == null ? "" : a.getName())
                            .compareToIgnoreCase(b.getName() == null ? "" : b.getName());
                })
                .map(v -> mapVendorAdmin(v, handoffs30d))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> adminListLeads() {
        return officialVendorLeadRepository.findTop100ByOrderByCreatedAtDesc().stream()
                .map(this::mapLead)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> mePartnerHub(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        String handle = user.getPublicHandle();
        if (handle == null || handle.isBlank()) {
            return Map.of("eligible", false);
        }
        Optional<OfficialVendor> vendorOpt = officialVendorRepository.findBySlug(handle.trim());
        if (vendorOpt.isEmpty()) {
            return Map.of("eligible", false);
        }
        OfficialVendor vendor = vendorOpt.get();
        if (!Boolean.TRUE.equals(vendor.getEnabled())) {
            return Map.of("eligible", false);
        }
        PartnerProgramTier tier = vendor.getPartnerProgramTier();
        if (tier == null || !tier.isOfficialPartner()) {
            return Map.of("eligible", false);
        }
        Instant since30d = Instant.now().minus(30, ChronoUnit.DAYS);
        Map<UUID, Map<String, Object>> handoffs30d = partnerHandoffAnalyticsService.adminHandoffByVendorSince(since30d);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("eligible", true);
        out.put("vendor", mapVendorAdmin(vendor, handoffs30d));
        out.put("storefrontPath", "/partner/" + vendor.getSlug());
        out.put("publicHandle", handle.trim());
        return out;
    }

    @Transactional
    public Map<String, Object> adminUpsertOutreachLead(String businessName, String contactEmail, String contactName,
                                                       String websiteUrl, String country, String state, String city,
                                                       String shippingScope, String note, String outreachLocale,
                                                       Map<String, Object> qualification, String internalNotes) {
        if (businessName == null || businessName.isBlank() || contactEmail == null || contactEmail.isBlank()) {
            throw new IllegalArgumentException("BUSINESS_NAME_AND_EMAIL_REQUIRED");
        }
        String emailNorm = contactEmail.trim().toLowerCase(Locale.ROOT);
        OfficialVendorLead lead = officialVendorLeadRepository.findTop100ByOrderByCreatedAtDesc().stream()
                .filter(l -> emailNorm.equalsIgnoreCase(l.getContactEmail()))
                .findFirst()
                .orElseGet(OfficialVendorLead::new);
        lead.setBusinessName(cleanText(businessName, 140));
        lead.setContactEmail(cleanText(contactEmail, 255));
        lead.setContactName(cleanText(contactName, 120));
        lead.setWebsiteUrl(cleanText(websiteUrl, 350));
        lead.setCountry(cleanText(country, 80));
        lead.setState(cleanText(state, 80));
        lead.setCity(cleanText(city, 80));
        lead.setShippingScope(cleanText(shippingScope, 80));
        if (note != null) {
            lead.setNote(cleanText(note, 1200));
        }
        if (outreachLocale != null && !outreachLocale.isBlank()) {
            lead.setOutreachLocale(BetaMailBodies.normalizeLocale(outreachLocale));
        }
        if (qualification != null) {
            lead.setQualification(new LinkedHashMap<>(qualification));
        }
        if (internalNotes != null) {
            lead.setInternalNotes(cleanText(internalNotes, 4000));
        }
        if (lead.getStatus() == null || lead.getStatus().isBlank()) {
            lead.setStatus("open");
        }
        return mapLead(officialVendorLeadRepository.save(lead));
    }

    @Transactional
    public Map<String, Object> adminPatchLeadOutreach(UUID leadId, String outreachLocale,
                                                      Map<String, Object> qualification, String internalNotes,
                                                      String websiteUrl) {
        OfficialVendorLead lead = officialVendorLeadRepository.findById(leadId)
                .orElseThrow(() -> new NotFoundException("Lead no encontrado"));
        if (outreachLocale != null && !outreachLocale.isBlank()) {
            lead.setOutreachLocale(BetaMailBodies.normalizeLocale(outreachLocale));
        }
        if (qualification != null) {
            lead.setQualification(new LinkedHashMap<>(qualification));
        }
        if (internalNotes != null) {
            lead.setInternalNotes(cleanText(internalNotes, 4000));
        }
        if (websiteUrl != null) {
            lead.setWebsiteUrl(cleanText(websiteUrl, 350));
        }
        return mapLead(officialVendorLeadRepository.save(lead));
    }

    @Transactional(readOnly = true)
    public Map<String, Object> adminPartnerReadinessReport(
            String websiteUrl,
            String feedUrl,
            String shopifyShopDomain,
            String shopifyAccessToken,
            String lightspeedApiKey,
            String lightspeedApiSecret,
            String lightspeedLang) {
        return partnerReadinessReportService.analyze(
                websiteUrl,
                feedUrl,
                buildPreviewFeedConfig(
                        feedUrl,
                        shopifyShopDomain,
                        shopifyAccessToken,
                        lightspeedApiKey,
                        lightspeedApiSecret,
                        lightspeedLang));
    }

    private static Map<String, Object> buildPreviewFeedConfig(
            String feedUrl,
            String shopifyShopDomain,
            String shopifyAccessToken,
            String lightspeedApiKey,
            String lightspeedApiSecret,
            String lightspeedLang) {
        Map<String, Object> config = new LinkedHashMap<>();
        if (feedUrl != null && !feedUrl.isBlank()) {
            config.put("feedUrl", feedUrl.trim());
        }
        putIfNonBlank(config, "shopifyShopDomain", shopifyShopDomain);
        putIfNonBlank(config, "shopifyAccessToken", shopifyAccessToken);
        putIfNonBlank(config, "lightspeedApiKey", lightspeedApiKey);
        putIfNonBlank(config, "lightspeedApiSecret", lightspeedApiSecret);
        putIfNonBlank(config, "lightspeedLang", lightspeedLang);
        return config.isEmpty() ? null : config;
    }

    private static void putIfNonBlank(Map<String, Object> config, String key, String value) {
        if (value != null && !value.isBlank()) {
            config.put(key, value.trim());
        }
    }

    @Transactional
    public Map<String, Object> adminPartnerReadinessReportForLead(UUID leadId) {
        OfficialVendorLead lead = officialVendorLeadRepository.findById(leadId)
                .orElseThrow(() -> new NotFoundException("Lead no encontrado"));
        Map<String, Object> report = partnerReadinessReportService.analyze(lead.getWebsiteUrl(), null, null);
        Map<String, Object> qual = lead.getQualification() == null ? new LinkedHashMap<>() : new LinkedHashMap<>(lead.getQualification());
        boolean autosyncToday = Boolean.TRUE.equals(report.get("autosyncSupportedToday"));
        qual.put("wooCommerce", autosyncToday);
        lead.setQualification(qual);
        lead.setWooProbeStatus(autosyncToday ? "reachable" : String.valueOf(report.getOrDefault("storeType", "unknown")));
        String summary = String.valueOf(report.getOrDefault("summaryLine", ""));
        lead.setWooProbeDetail(summary.substring(0, Math.min(500, summary.length())));
        officialVendorLeadRepository.save(lead);
        Map<String, Object> out = mapLead(lead);
        out.put("readinessReport", report);
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> adminProbeWooCommerce(String websiteUrl) {
        String base = trimTrailingSlash(websiteUrl);
        if (base == null || base.isBlank()) {
            throw new IllegalArgumentException("WEBSITE_URL_REQUIRED");
        }
        String probeUrl = base + "/wp-json/wc/store/v1/products?per_page=1";
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("websiteUrl", base);
        out.put("probeUrl", probeUrl);
        try {
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(8))
                    .followRedirects(HttpClient.Redirect.NORMAL)
                    .build();
            HttpRequest request = HttpRequest.newBuilder(URI.create(probeUrl))
                    .timeout(Duration.ofSeconds(12))
                    .header("Accept", "application/json")
                    .GET()
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            int code = response.statusCode();
            out.put("httpStatus", code);
            boolean ok = code >= 200 && code < 300 && response.body() != null && response.body().contains("\"id\"");
            out.put("ok", ok);
            out.put("status", ok ? "reachable" : "failed");
            out.put("detail", ok ? "Woo Store API responded with products" : "HTTP " + code + " — check Woo Store API or firewall");
        } catch (Exception ex) {
            out.put("ok", false);
            out.put("status", "error");
            out.put("detail", ex.getMessage() == null ? "Probe failed" : ex.getMessage());
        }
        return out;
    }

    @Transactional
    public Map<String, Object> adminProbeAndSaveLeadWoo(UUID leadId) {
        OfficialVendorLead lead = officialVendorLeadRepository.findById(leadId)
                .orElseThrow(() -> new NotFoundException("Lead no encontrado"));
        Map<String, Object> probe = adminProbeWooCommerce(lead.getWebsiteUrl());
        lead.setWooProbeStatus(String.valueOf(probe.get("status")));
        Object detail = probe.get("detail");
        lead.setWooProbeDetail(detail == null ? "" : String.valueOf(detail).substring(0, Math.min(500, String.valueOf(detail).length())));
        Map<String, Object> qual = lead.getQualification() == null ? new LinkedHashMap<>() : new LinkedHashMap<>(lead.getQualification());
        qual.put("wooCommerce", Boolean.TRUE.equals(probe.get("ok")));
        lead.setQualification(qual);
        officialVendorLeadRepository.save(lead);
        Map<String, Object> out = mapLead(lead);
        out.put("wooProbe", probe);
        return out;
    }

    @Transactional
    public Map<String, Object> adminSendLeadOutreachEmail(UUID leadId, String templateKey, String locale,
                                                          boolean attachOnePager) {
        OfficialVendorLead lead = officialVendorLeadRepository.findById(leadId)
                .orElseThrow(() -> new NotFoundException("Lead no encontrado"));
        String loc = locale == null || locale.isBlank()
                ? (lead.getOutreachLocale() == null ? "en" : lead.getOutreachLocale())
                : locale;
        loc = BetaMailBodies.normalizeLocale(loc);
        String template = templateKey == null || templateKey.isBlank() ? "partner_outreach_intro" : templateKey.trim();
        if (!BetaMailBodies.BATCH_CAMPAIGN_KEYS.contains(template)) {
            throw new IllegalArgumentException("INVALID_OUTREACH_TEMPLATE");
        }
        if ("partner_catalog_live".equals(template) && !"converted".equalsIgnoreCase(lead.getStatus())) {
            throw new IllegalArgumentException("LEAD_NOT_CONVERTED_USE_INTRO");
        }
        if ("partner_outreach_intro".equals(template)) {
            emailService.sendPartnerOutreachIntroEmail(
                    lead.getContactEmail(), lead.getBusinessName(), lead.getWebsiteUrl(), loc, attachOnePager);
        } else if ("partner_catalog_live".equals(template)) {
            emailService.sendPartnerCatalogLiveEmail(
                    lead.getContactEmail(), lead.getBusinessName(), 0L,
                    appBaseUrl + "/partners", lead.getWebsiteUrl(), loc, attachOnePager);
        } else {
            throw new IllegalArgumentException("INVALID_OUTREACH_TEMPLATE");
        }
        lead.setLastOutreachAt(Instant.now());
        lead.setOutreachLocale(loc);
        officialVendorLeadRepository.save(lead);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("sent", true);
        out.put("email", lead.getContactEmail());
        out.put("template", template);
        out.put("locale", loc);
        out.put("attachOnePager", attachOnePager);
        return out;
    }

    /**
     * Admin checklist for partner/vendor ecosystem closure (tiers migrated, Monarch ready, second official partner).
     */
    @Transactional(readOnly = true)
    public Map<String, Object> adminEcosystemClosureStatus() {
        List<OfficialVendor> all = officialVendorRepository.findAll();
        long legacyTierRows = all.stream()
                .filter(v -> v.getPartnerProgramTier() == PartnerProgramTier.STRATEGIC_FOUNDER
                        || v.getPartnerProgramTier() == PartnerProgramTier.STRATEGIC_PARTNER)
                .count();

        Optional<OfficialVendor> monarchOpt = officialVendorRepository.findBySlug("monarch-reptiles");
        boolean monarchConfigured = monarchOpt.isPresent();
        boolean monarchFoundingTier = monarchOpt
                .map(v -> v.getPartnerProgramTier() != null && v.getPartnerProgramTier().isFoundingPartner())
                .orElse(false);
        boolean monarchImportEnabled = monarchOpt
                .map(v -> Boolean.TRUE.equals(v.getListingImportEnabled()))
                .orElse(false);
        boolean monarchEnabled = monarchOpt.map(OfficialVendor::getEnabled).orElse(false);
        String monarchLatestSyncStatus = "";
        boolean monarchSyncOk = false;
        if (monarchOpt.isPresent()) {
            List<PartnerListingSyncRun> runs = partnerListingSyncRunRepository
                    .findTop50ByOfficialVendorIdOrderByStartedAtDesc(monarchOpt.get().getId());
            if (!runs.isEmpty() && runs.get(0).getStatus() != null) {
                monarchLatestSyncStatus = runs.get(0).getStatus().name().toLowerCase(Locale.ROOT);
                monarchSyncOk = runs.get(0).getStatus() == PartnerListingSyncRunStatus.SUCCESS;
            }
        }

        long otherOfficialWithImport = all.stream()
                .filter(v -> v.getSlug() != null && !"monarch-reptiles".equals(v.getSlug()))
                .filter(v -> Boolean.TRUE.equals(v.getListingImportEnabled()))
                .filter(v -> v.getPartnerProgramTier() != null && v.getPartnerProgramTier().isOfficialPartner())
                .count();

        boolean legacyTierOk = legacyTierRows == 0;
        boolean otherOfficialPartnerOk = otherOfficialWithImport >= 1;
        boolean monarchReady = monarchConfigured && monarchFoundingTier && monarchImportEnabled && monarchEnabled;
        boolean allChecksPass = legacyTierOk && monarchReady && monarchSyncOk && otherOfficialPartnerOk;

        List<Map<String, Object>> checks = new ArrayList<>();
        checks.add(closureCheck("legacyTiersMigrated", legacyTierOk,
                legacyTierOk ? "No STRATEGIC_* tiers in official_vendors" : legacyTierRows + " row(s) still use legacy tiers"));
        checks.add(closureCheck("monarchConfigured", monarchReady,
                monarchReady ? "Monarch founding partner enabled with import" : "Configure monarch-reptiles (founding, import, enabled)"));
        checks.add(closureCheck("monarchSyncSuccess", monarchSyncOk,
                monarchSyncOk ? "Latest Monarch sync succeeded" : "Run test sync for Monarch (status: " + monarchLatestSyncStatus + ")"));
        checks.add(closureCheck("secondOfficialPartner", otherOfficialPartnerOk,
                otherOfficialPartnerOk
                        ? otherOfficialWithImport + " other official partner(s) with import on"
                        : "Promote/onboard at least one non-Monarch official partner with import enabled"));

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("legacyTierRows", legacyTierRows);
        out.put("legacyTierOk", legacyTierOk);
        out.put("monarchConfigured", monarchConfigured);
        out.put("monarchFoundingTier", monarchFoundingTier);
        out.put("monarchImportEnabled", monarchImportEnabled);
        out.put("monarchEnabled", monarchEnabled);
        out.put("monarchLatestSyncStatus", monarchLatestSyncStatus);
        out.put("monarchSyncOk", monarchSyncOk);
        out.put("otherOfficialPartnersWithImport", otherOfficialWithImport);
        out.put("otherOfficialPartnerOk", otherOfficialPartnerOk);
        out.put("allChecksPass", allChecksPass);
        out.put("checks", checks);
        return out;
    }

    private static Map<String, Object> closureCheck(String id, boolean ok, String detail) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        row.put("ok", ok);
        row.put("detail", detail);
        return row;
    }

    @Transactional
    public Map<String, Object> adminSetVendorEnabled(UUID vendorId, boolean enabled) {
        OfficialVendor vendor = officialVendorRepository.findById(vendorId)
                .orElseThrow(() -> new NotFoundException("Vendor oficial no encontrado"));
        vendor.setEnabled(enabled);
        return mapVendor(officialVendorRepository.save(vendor));
    }

    /**
     * Updates partner ecosystem flags and feed config for an official vendor.
     * {@code listingImportEnabled} toggles approved ingest eligibility; vendor subscriptions do not imply sync.
     */
    @Transactional
    public Map<String, Object> adminUpdateStrategicProgram(UUID vendorId,
                                                           Boolean strategicFounder,
                                                           Boolean listingImportEnabled,
                                                           String partnerProgramTier,
                                                           String feedType,
                                                           String feedBaseUrl,
                                                           Map<String, Object> feedConfig,
                                                           String badge,
                                                           String websiteUrl,
                                                           Integer influenceScore,
                                                           String note) {
        OfficialVendor vendor = officialVendorRepository.findById(vendorId)
                .orElseThrow(() -> new NotFoundException("Vendor oficial no encontrado"));
        PartnerProgramTier tier = resolvePartnerProgramTier(partnerProgramTier, strategicFounder, vendor.getPartnerProgramTier());
        if (tier != null || partnerProgramTier != null || strategicFounder != null) {
            vendor.setPartnerProgramTier(tier);
        }
        if (listingImportEnabled != null) {
            vendor.setListingImportEnabled(listingImportEnabled);
        }
        if (feedType != null) {
            vendor.setFeedType(cleanFeedType(feedType));
        }
        if (feedBaseUrl != null) {
            vendor.setFeedBaseUrl(trimTrailingSlash(feedBaseUrl));
        }
        if (feedConfig != null) {
            vendor.setFeedConfig(sanitizeFeedConfig(feedConfig, vendor.getPartnerProgramTier()));
        }
        if (badge != null) {
            vendor.setBadge(cleanText(badge, 80));
        }
        if (websiteUrl != null) {
            vendor.setWebsiteUrl(optionalWebsite(websiteUrl));
        }
        if (influenceScore != null) {
            vendor.setInfluenceScore(Math.max(0, Math.min(1000, influenceScore)));
        }
        if (note != null) {
            vendor.setNote(cleanText(note, 200));
        }
        return mapVendor(officialVendorRepository.save(vendor));
    }

    private boolean vendorMatchesQuery(Map<String, Object> vendor, String queryNorm) {
        String name = normalize((String) vendor.get("name"));
        String state = normalize((String) vendor.get("state"));
        String city = normalize((String) vendor.get("city"));
        String country = normalize((String) vendor.get("country"));
        String note = normalize((String) vendor.get("note"));
        return (name != null && name.contains(queryNorm))
                || (state != null && state.contains(queryNorm))
                || (city != null && city.contains(queryNorm))
                || (country != null && country.contains(queryNorm))
                || (note != null && note.contains(queryNorm));
    }

    private int rankVendor(Map<String, Object> vendor, String nearCountry, String nearState, String nearCity) {
        int score = 0;
        String vendorCountry = normalize((String) vendor.get("country"));
        String vendorState = normalize((String) vendor.get("state"));
        String vendorCity = normalize((String) vendor.get("city"));
        if (nearCountry != null && nearCountry.equals(vendorCountry)) score += 12;
        if (nearState != null && nearState.equals(vendorState)) score += 18;
        if (nearCity != null && nearCity.equals(vendorCity)) score += 24;

        @SuppressWarnings("unchecked")
        List<String> shipsTo = (List<String>) vendor.getOrDefault("shipsToCountries", List.of());
        if (nearCountry != null && shipsTo.stream().anyMatch(c -> nearCountry.equals(normalize(c)))) {
            score += 8;
        }

        Number influenceScore = (Number) vendor.getOrDefault("influenceScore", 0);
        score += influenceScore.intValue();
        return score;
    }

    private Map<String, Object> mapVendorAdmin(OfficialVendor vendor, Map<UUID, Map<String, Object>> handoffs30d) {
        Map<String, Object> out = mapVendor(vendor);
        out.put("opsSummary", buildOpsSummary(vendor.getId(), handoffs30d));
        // Admin/partner-only checkout detail (commission, payout, eligibility) — never exposed publicly.
        PartnerCheckoutConfig cfg = PartnerCheckoutConfig.fromVendor(vendor);
        @SuppressWarnings("unchecked")
        Map<String, Object> checkout = (Map<String, Object>) out.get("checkout");
        if (checkout != null) {
            checkout.put("preferredMode", cfg.preferredMode());
            checkout.put("inAppEligible", cfg.inAppAvailable());
            checkout.put("inAppCheckoutCountry", RegionPolicy.isInAppCheckoutCountry(vendor.getCountry()));
            checkout.put("payoutMode", cfg.payoutMode());
            checkout.put("commissionPercent", cfg.commissionPercent());
            checkout.put("commissionWaived", cfg.commissionWaived());
            checkout.put("providers", cfg.providers());
            checkout.put("stripeAccountLinked", cfg.stripeAccountId() != null && !cfg.stripeAccountId().isBlank());
        }
        return out;
    }

    /**
     * Partner self-service: switch the preferred checkout channel between their
     * website and the in-app TarantulApp cart. Only allowed when an admin has
     * already enabled in-app checkout for an eligible (Canada, official) vendor.
     */
    @Transactional
    public Map<String, Object> mePartnerSetCheckoutMode(UUID userId, String mode) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        String handle = user.getPublicHandle();
        if (handle == null || handle.isBlank()) {
            throw new NotFoundException("Partner no encontrado");
        }
        OfficialVendor vendor = officialVendorRepository.findBySlug(handle.trim())
                .orElseThrow(() -> new NotFoundException("Partner no encontrado"));
        PartnerCheckoutConfig cfg = PartnerCheckoutConfig.fromVendor(vendor);
        String requested = PartnerCheckoutConfig.MODE_IN_APP.equalsIgnoreCase(mode)
                ? PartnerCheckoutConfig.MODE_IN_APP
                : PartnerCheckoutConfig.MODE_WEBSITE;
        if (PartnerCheckoutConfig.MODE_IN_APP.equals(requested) && !cfg.inAppAvailable()) {
            throw new IllegalArgumentException("IN_APP_CHECKOUT_NOT_ENABLED");
        }
        Map<String, Object> feed = vendor.getFeedConfig() == null
                ? new LinkedHashMap<>()
                : new LinkedHashMap<>(vendor.getFeedConfig());
        feed.put("checkoutMode", requested);
        vendor.setFeedConfig(feed);
        officialVendorRepository.save(vendor);
        return mePartnerHub(userId);
    }

    private Map<String, Object> buildOpsSummary(UUID vendorId, Map<UUID, Map<String, Object>> handoffs30d) {
        Map<String, Object> ops = new LinkedHashMap<>();
        Map<String, Object> handoff = handoffs30d.getOrDefault(vendorId, Map.of());
        ops.put("handoffs30d", handoff.getOrDefault("handoffs", 0L));
        ops.put("linesSent30d", handoff.getOrDefault("linesSent", 0L));
        ops.put("itemsSent30d", handoff.getOrDefault("itemsSent", 0L));
        List<PartnerListingSyncRun> runs = partnerListingSyncRunRepository
                .findTop50ByOfficialVendorIdOrderByStartedAtDesc(vendorId);
        if (!runs.isEmpty()) {
            PartnerListingSyncRun run = runs.get(0);
            Map<String, Object> sync = new LinkedHashMap<>();
            sync.put("status", run.getStatus() == null ? "" : run.getStatus().name().toLowerCase(Locale.ROOT));
            sync.put("startedAt", run.getStartedAt());
            sync.put("finishedAt", run.getFinishedAt());
            sync.put("processedCount", run.getProcessedCount());
            sync.put("upsertedCount", run.getUpsertedCount());
            sync.put("staleCount", run.getStaleCount());
            sync.put("skippedCount", run.getSkippedCount());
            sync.put("failedCount", run.getFailedCount());
            sync.put("errorMessage", run.getErrorMessage() == null ? "" : run.getErrorMessage());
            ops.put("latestSync", sync);
        } else {
            ops.put("latestSync", null);
        }
        return ops;
    }

    private Map<String, Object> mapVendor(OfficialVendor vendor) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", vendor.getId());
        out.put("slug", vendor.getSlug());
        out.put("name", vendor.getName());
        out.put("country", vendor.getCountry());
        out.put("state", vendor.getState() == null ? "" : vendor.getState());
        out.put("city", vendor.getCity() == null ? "" : vendor.getCity());
        out.put("websiteUrl", vendor.getWebsiteUrl());
        out.put("nationalShipping", Boolean.TRUE.equals(vendor.getNationalShipping()));
        out.put("shipsToCountries", splitCountries(vendor.getShipsToCountries()));
        out.put("influenceScore", vendor.getInfluenceScore() == null ? 0 : vendor.getInfluenceScore());
        out.put("badge", vendor.getBadge() == null ? "Official partner" : vendor.getBadge());
        out.put("note", vendor.getNote() == null ? "" : vendor.getNote());
        String logoUrl = resolveVendorLogoUrl(vendor);
        if (logoUrl != null) {
            out.put("logoUrl", logoUrl);
        }
        out.put("enabled", Boolean.TRUE.equals(vendor.getEnabled()));
        out.put("partnerProgramTier", vendor.getPartnerProgramTier() == null ? null : vendor.getPartnerProgramTier().name());
        out.put("partnerTier", partnerTierKey(vendor.getPartnerProgramTier()));
        out.put("isFoundingPartner", vendor.getPartnerProgramTier() != null && vendor.getPartnerProgramTier().isFoundingPartner());
        out.put("listingImportEnabled", Boolean.TRUE.equals(vendor.getListingImportEnabled()));
        out.put("isDemo", Boolean.TRUE.equals(vendor.getIsDemo()));
        out.put("feedBaseUrl", vendor.getFeedBaseUrl() == null ? "" : vendor.getFeedBaseUrl());
        out.put("feedType", vendor.getFeedType() == null ? "" : vendor.getFeedType());
        out.put("feedConfig", vendor.getFeedConfig() == null ? Map.of() : vendor.getFeedConfig());
        // Public-safe checkout summary: only whether in-app pay is live + the effective channel.
        PartnerCheckoutConfig checkoutConfig = PartnerCheckoutConfig.fromVendor(vendor);
        Map<String, Object> checkout = new LinkedHashMap<>();
        checkout.put("inAppAvailable", checkoutConfig.usesInAppCheckout());
        checkout.put("mode", checkoutConfig.effectiveMode());
        out.put("checkout", checkout);
        out.put("createdAt", vendor.getCreatedAt());
        long catalogTotal = resolvePublicCatalogTotal(vendor);
        out.put("catalogTotal", catalogTotal);
        out.put("activeListingCount", catalogTotal);
        return out;
    }

    /** Same gate + filters as {@link com.tarantulapp.service.MarketplaceService#publicPartnerCatalog}. */
    private long resolvePublicCatalogTotal(OfficialVendor vendor) {
        if (vendor.getId() == null || !Boolean.TRUE.equals(vendor.getListingImportEnabled())) {
            return 0L;
        }
        PartnerProgramTier tier = vendor.getPartnerProgramTier();
        if (tier == null || !tier.isOfficialPartner()) {
            return 0L;
        }
        Map<String, Object> feedConfig = vendor.getFeedConfig() == null ? Map.of() : vendor.getFeedConfig();
        return partnerListingRepository
                .findByOfficialVendorIdAndStatusInOrderByPromotedDescLastSyncedAtDesc(
                        vendor.getId(), List.of(PartnerListingStatus.ACTIVE))
                .stream()
                .filter(p -> PartnerListingCatalogRules.isAllowedListing(
                        p.getTitle(), p.getDescription(), p.getListingCategory(), feedConfig))
                .count();
    }

    /**
     * Creates an official vendor directly from admin (no /partners lead required).
     */
    @Transactional
    public Map<String, Object> adminCreateOfficialVendor(String name,
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
                                                         String note) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("NAME_REQUIRED");
        }
        String website = optionalWebsite(websiteUrl);
        if (Boolean.TRUE.equals(enableImport) && website == null) {
            throw new IllegalArgumentException("WEBSITE_OR_FEED_REQUIRED_FOR_IMPORT");
        }
        String normalizedSlug = resolveUniqueSlug(slug, name);
        OfficialVendor vendor = new OfficialVendor();
        vendor.setSlug(normalizedSlug);
        vendor.setName(name.trim());
        vendor.setCountry(country == null || country.isBlank() ? "International" : country.trim());
        vendor.setState(cleanText(state, 80));
        vendor.setCity(cleanText(city, 80));
        vendor.setWebsiteUrl(website);
        vendor.setNationalShipping(true);
        vendor.setShipsToCountries(MarketplaceService.countryNameToIso(vendor.getCountry()));
        vendor.setInfluenceScore(influenceScore == null ? 50 : Math.max(0, Math.min(1000, influenceScore)));
        vendor.setNote(cleanText(note, 1200));
        vendor.setBadge(cleanText(badge, 80) == null ? "Official partner" : cleanText(badge, 80));
        vendor.setEnabled(Boolean.TRUE.equals(enabled));
        PartnerProgramTier tier = resolvePartnerProgramTier(partnerProgramTier, null, PartnerProgramTier.OFFICIAL_PARTNER);
        vendor.setPartnerProgramTier(tier == null ? PartnerProgramTier.OFFICIAL_PARTNER : tier);
        vendor.setListingImportEnabled(Boolean.TRUE.equals(enableImport));
        vendor.setIsDemo(false);
        applyFeedDefaultsForImport(vendor, website, null, null, null);
        vendor.setFeedConfig(sanitizeFeedConfig(null, vendor.getPartnerProgramTier()));
        officialVendorRepository.save(vendor);
        Instant since30d = Instant.now().minus(30, ChronoUnit.DAYS);
        Map<UUID, Map<String, Object>> handoffs30d = partnerHandoffAnalyticsService.adminHandoffByVendorSince(since30d);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("vendor", mapVendorAdmin(vendor, handoffs30d));
        return out;
    }

    @Transactional(readOnly = true)
    public boolean isUserOfficialPartner(User user) {
        if (user == null || user.getPublicHandle() == null || user.getPublicHandle().isBlank()) {
            return false;
        }
        return officialVendorRepository.findBySlug(user.getPublicHandle().trim())
                .filter(v -> Boolean.TRUE.equals(v.getEnabled()))
                .map(v -> {
                    PartnerProgramTier tier = v.getPartnerProgramTier();
                    return tier != null && tier.isOfficialPartner();
                })
                .orElse(false);
    }

    /**
     * Promotes a community seller account to official partner using their public handle as slug.
     * Creates or upgrades the matching {@link OfficialVendor} row.
     */
    @Transactional
    public Map<String, Object> adminPromoteUserToOfficialPartner(UUID userId,
                                                                 String partnerProgramTier,
                                                                 Boolean enabled,
                                                                 Boolean enableImport,
                                                                 String badge,
                                                                 String websiteUrl,
                                                                 String note) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
        String handle = user.getPublicHandle();
        if (handle == null || handle.isBlank()) {
            throw new IllegalArgumentException("PUBLIC_HANDLE_REQUIRED");
        }
        String slug = slugify(handle);
        if (slug.isBlank()) {
            throw new IllegalArgumentException("INVALID_PUBLIC_HANDLE");
        }
        PartnerProgramTier tier = resolvePartnerProgramTier(partnerProgramTier, null, PartnerProgramTier.OFFICIAL_PARTNER);
        if (tier == null) {
            tier = PartnerProgramTier.OFFICIAL_PARTNER;
        }
        String website = optionalWebsite(websiteUrl);
        String displayName = user.getStorefrontName();
        if (displayName == null || displayName.isBlank()) {
            displayName = user.getDisplayName();
        }
        if (displayName == null || displayName.isBlank()) {
            displayName = handle.trim();
        }
        boolean activate = enabled == null || enabled;
        String badgeText = cleanText(badge, 80);
        if (badgeText == null) {
            badgeText = tier.isFoundingPartner() ? "Founding partner" : "Official partner";
        }

        OfficialVendor vendor = officialVendorRepository.findBySlug(slug).orElse(null);
        boolean created = vendor == null;
        if (vendor == null) {
            vendor = new OfficialVendor();
            vendor.setSlug(slug);
            vendor.setIsDemo(false);
            vendor.setInfluenceScore(50);
        }
        vendor.setName(displayName.trim());
        vendor.setWebsiteUrl(website);
        if (Boolean.TRUE.equals(enableImport)) {
            applyFeedDefaultsForImport(vendor, website, null, null, null);
        }
        vendor.setCountry(user.getProfileCountry() == null || user.getProfileCountry().isBlank()
                ? "International" : user.getProfileCountry().trim());
        vendor.setState(user.getProfileState());
        vendor.setCity(user.getProfileCity());
        vendor.setNationalShipping(true);
        vendor.setShipsToCountries(MarketplaceService.countryNameToIso(vendor.getCountry()));
        vendor.setPartnerProgramTier(tier);
        vendor.setListingImportEnabled(Boolean.TRUE.equals(enableImport));
        vendor.setEnabled(activate);
        vendor.setBadge(badgeText);
        if (note != null) {
            vendor.setNote(cleanText(note, 1200));
        } else if (created && vendor.getNote() == null) {
            vendor.setNote("Promoted from community seller account.");
        }
        vendor.setFeedConfig(sanitizeFeedConfig(vendor.getFeedConfig(), tier));
        officialVendorRepository.save(vendor);

        Instant since30d = Instant.now().minus(30, ChronoUnit.DAYS);
        Map<UUID, Map<String, Object>> handoffs30d = partnerHandoffAnalyticsService.adminHandoffByVendorSince(since30d);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("created", created);
        out.put("vendor", mapVendorAdmin(vendor, handoffs30d));
        out.put("officialPartner", true);
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> adminVendorBranding(UUID vendorId) {
        OfficialVendor vendor = officialVendorRepository.findById(vendorId)
                .orElseThrow(() -> new NotFoundException("Vendor oficial no encontrado"));
        return vendorBrandingMap(vendor);
    }

    @Transactional
    public Map<String, Object> adminUploadVendorLogo(UUID vendorId, MultipartFile file) throws IOException {
        OfficialVendor vendor = officialVendorRepository.findById(vendorId)
                .orElseThrow(() -> new NotFoundException("Vendor oficial no encontrado"));
        FileStorageService.LogoVariants variants = fileStorageService.saveLogoWithMonochrome(file, "vendor-logos");
        deletePreviousVendorLogoAssets(vendor);
        vendor.setLogoUrl(variants.colorPath());
        vendor.setLogoBwUrl(variants.bwPath());
        officialVendorRepository.save(vendor);
        return vendorBrandingMap(vendor);
    }

    @Transactional
    public Map<String, Object> adminDeleteVendorLogo(UUID vendorId) {
        OfficialVendor vendor = officialVendorRepository.findById(vendorId)
                .orElseThrow(() -> new NotFoundException("Vendor oficial no encontrado"));
        deletePreviousVendorLogoAssets(vendor);
        vendor.setLogoUrl(null);
        vendor.setLogoBwUrl(null);
        officialVendorRepository.save(vendor);
        return vendorBrandingMap(vendor);
    }

    /**
     * Creates an {@link OfficialVendor} from a submitted lead and marks the lead converted.
     * Defaults: OFFICIAL_PARTNER, import off, vendor disabled until ops review.
     */
    @Transactional
    public Map<String, Object> adminPromoteLeadToVendor(UUID leadId,
                                                        Boolean enableImport,
                                                        Boolean strategicFounder,
                                                        String partnerProgramTier,
                                                        String feedType,
                                                        String feedBaseUrl,
                                                        Map<String, Object> feedConfig,
                                                        String badge,
                                                        Integer influenceScore) {
        OfficialVendorLead lead = officialVendorLeadRepository.findById(leadId)
                .orElseThrow(() -> new NotFoundException("Lead no encontrado"));
        if ("converted".equalsIgnoreCase(lead.getStatus())) {
            throw new IllegalArgumentException("LEAD_ALREADY_CONVERTED");
        }
        String slug = uniqueSlugFromBusinessName(lead.getBusinessName());
        String website = optionalWebsite(lead.getWebsiteUrl());
        String resolvedFeedBase = trimTrailingSlash(feedBaseUrl == null || feedBaseUrl.isBlank() ? website : feedBaseUrl);
        if (Boolean.TRUE.equals(enableImport) && website == null && resolvedFeedBase == null) {
            throw new IllegalArgumentException("WEBSITE_OR_FEED_REQUIRED_FOR_IMPORT");
        }

        OfficialVendor vendor = new OfficialVendor();
        vendor.setSlug(slug);
        vendor.setName(lead.getBusinessName());
        vendor.setCountry(lead.getCountry() == null || lead.getCountry().isBlank() ? "International" : lead.getCountry().trim());
        vendor.setState(lead.getState());
        vendor.setCity(lead.getCity());
        vendor.setWebsiteUrl(website);
        vendor.setNationalShipping(true);
        vendor.setShipsToCountries(MarketplaceService.countryNameToIso(vendor.getCountry()));
        vendor.setInfluenceScore(influenceScore == null ? 50 : Math.max(0, Math.min(1000, influenceScore)));
        vendor.setNote(lead.getNote());
        vendor.setBadge(cleanText(badge, 80) == null ? "Official partner" : cleanText(badge, 80));
        vendor.setEnabled(false);
        PartnerProgramTier tier = resolvePartnerProgramTier(partnerProgramTier, strategicFounder, PartnerProgramTier.OFFICIAL_PARTNER);
        vendor.setPartnerProgramTier(tier == null ? PartnerProgramTier.OFFICIAL_PARTNER : tier);
        vendor.setListingImportEnabled(Boolean.TRUE.equals(enableImport));
        vendor.setIsDemo(false);
        applyFeedDefaultsForImport(vendor, website, resolvedFeedBase, feedType, enableImport);
        vendor.setFeedConfig(sanitizeFeedConfig(feedConfig, vendor.getPartnerProgramTier()));

        officialVendorRepository.save(vendor);
        lead.setStatus("converted");
        officialVendorLeadRepository.save(lead);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("vendor", mapVendor(vendor));
        out.put("lead", mapLead(lead));
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> sendPartnerCatalogLiveEmail(UUID vendorId, String toEmail, String locale) {
        OfficialVendor vendor = officialVendorRepository.findById(vendorId)
                .orElseThrow(() -> new NotFoundException("Vendor no encontrado"));
        String email = resolvePartnerContactEmail(vendor, toEmail);
        if (email.isBlank()) {
            throw new IllegalArgumentException("CONTACT_EMAIL_REQUIRED");
        }
        long listingCount = partnerListingRepository.countByOfficialVendorIdAndStatus(
                vendor.getId(), PartnerListingStatus.ACTIVE);
        String storefrontUrl = appBaseUrl + "/partner/" + vendor.getSlug();
        emailService.sendPartnerCatalogLiveEmail(
                email,
                vendor.getName(),
                listingCount,
                storefrontUrl,
                vendor.getWebsiteUrl(),
                locale);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("sent", true);
        out.put("email", email);
        out.put("listingCount", listingCount);
        out.put("storefrontUrl", storefrontUrl);
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> sendPartnerCatalogLiveEmailForLead(UUID leadId, String locale) {
        OfficialVendorLead lead = officialVendorLeadRepository.findById(leadId)
                .orElseThrow(() -> new NotFoundException("Lead no encontrado"));
        String email = lead.getContactEmail() == null ? "" : lead.getContactEmail().trim();
        if (email.isBlank()) {
            throw new IllegalArgumentException("CONTACT_EMAIL_REQUIRED");
        }
        String storefrontHint = appBaseUrl + "/partners";
        emailService.sendPartnerCatalogLiveEmail(
                email,
                lead.getBusinessName(),
                0L,
                storefrontHint,
                lead.getWebsiteUrl(),
                locale);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("sent", true);
        out.put("email", email);
        return out;
    }

    private String resolvePartnerContactEmail(OfficialVendor vendor, String overrideEmail) {
        if (overrideEmail != null && !overrideEmail.isBlank()) {
            return overrideEmail.trim();
        }
        String vendorSite = vendor.getWebsiteUrl() == null ? "" : vendor.getWebsiteUrl().trim().toLowerCase(Locale.ROOT);
        return officialVendorLeadRepository.findTop100ByOrderByCreatedAtDesc().stream()
                .filter(l -> l.getContactEmail() != null && !l.getContactEmail().isBlank())
                .filter(l -> {
                    if (l.getBusinessName() != null && vendor.getName() != null
                            && l.getBusinessName().equalsIgnoreCase(vendor.getName().trim())) {
                        return true;
                    }
                    String leadSite = l.getWebsiteUrl() == null ? "" : l.getWebsiteUrl().trim().toLowerCase(Locale.ROOT);
                    return !vendorSite.isBlank() && vendorSite.equals(leadSite);
                })
                .map(OfficialVendorLead::getContactEmail)
                .findFirst()
                .orElse("");
    }

    private static String optionalWebsite(String websiteUrl) {
        return trimTrailingSlash(websiteUrl);
    }

    /**
     * Catalog sync is optional. Only configure feed fields when import is enabled.
     */
    private static void applyFeedDefaultsForImport(OfficialVendor vendor,
                                                   String website,
                                                   String feedBaseUrl,
                                                   String feedType,
                                                   Boolean enableImport) {
        if (!Boolean.TRUE.equals(enableImport)) {
            vendor.setFeedBaseUrl(null);
            vendor.setFeedType(null);
            return;
        }
        String base = feedBaseUrl != null && !feedBaseUrl.isBlank() ? feedBaseUrl : website;
        vendor.setFeedBaseUrl(trimTrailingSlash(base));
        String guessed = feedType == null || feedType.isBlank() ? guessFeedType(base) : feedType.trim();
        vendor.setFeedType(guessed == null || guessed.isBlank() ? null : cleanFeedType(guessed));
    }

    private static String guessFeedType(String websiteUrl) {
        if (websiteUrl == null || websiteUrl.isBlank()) {
            return null;
        }
        String u = websiteUrl.toLowerCase(Locale.ROOT);
        if (u.contains("woocommerce") || u.contains("/product") || u.contains("wp-json")) {
            return "woocommerce";
        }
        return null;
    }

    private static PartnerProgramTier resolvePartnerProgramTier(String raw,
                                                                Boolean strategicFounder,
                                                                PartnerProgramTier fallback) {
        if (raw != null) {
            String t = raw.trim().toUpperCase(Locale.ROOT)
                    .replace('-', '_')
                    .replace(' ', '_');
            if (t.isBlank() || "NONE".equals(t) || "COMMUNITY_SELLER".equals(t) || "VERIFIED_VENDOR".equals(t)) {
                return null;
            }
            if ("FOUNDING".equals(t) || "FOUNDING_PARTNER".equals(t) || "FOUNDER".equals(t)
                    || "STRATEGIC_FOUNDER".equals(t)) {
                return PartnerProgramTier.FOUNDING_PARTNER;
            }
            if ("OFFICIAL".equals(t) || "OFFICIAL_PARTNER".equals(t) || "STRATEGIC_PARTNER".equals(t)) {
                return PartnerProgramTier.OFFICIAL_PARTNER;
            }
            throw new IllegalArgumentException("INVALID_PARTNER_PROGRAM_TIER");
        }
        if (strategicFounder != null) {
            return Boolean.TRUE.equals(strategicFounder) ? PartnerProgramTier.FOUNDING_PARTNER : PartnerProgramTier.OFFICIAL_PARTNER;
        }
        return fallback;
    }

    private static String partnerTierKey(PartnerProgramTier tier) {
        if (tier == null) return null;
        return tier.isFoundingPartner() ? "founding" : "official";
    }

    private static String cleanFeedType(String raw) {
        if (raw == null) return null;
        String t = raw.trim().toLowerCase(Locale.ROOT);
        if (t.isBlank()) return null;
        if (!List.of("woocommerce", "static", "mock", "shopify", "html_scraper", "csv", "lightspeed").contains(t)) {
            throw new IllegalArgumentException("INVALID_FEED_TYPE");
        }
        return t;
    }

    private static Map<String, Object> sanitizeFeedConfig(Map<String, Object> raw, PartnerProgramTier tier) {
        Map<String, Object> out = new LinkedHashMap<>();
        if (raw != null) {
            raw.forEach((key, value) -> {
                if (key != null && value != null) {
                    out.put(key.trim(), value);
                }
            });
        }
        String tierKey = partnerTierKey(tier);
        if (tierKey != null) {
            out.putIfAbsent("partnerTier", tierKey);
        }
        out.putIfAbsent("boostLevel", tier != null && tier.isFoundingPartner() ? 2 : 1);
        out.putIfAbsent("allowedCategories", List.of());
        out.putIfAbsent("blockedCategories", List.of());
        out.putIfAbsent("blockedCategorySlugs", List.of());
        out.putIfAbsent("categoryMapping", Map.of());
        return out;
    }

    private String uniqueSlugFromBusinessName(String businessName) {
        return resolveUniqueSlug(null, businessName);
    }

    private String resolveUniqueSlug(String requestedSlug, String fallbackName) {
        String base = slugify(requestedSlug);
        if (base.isBlank()) {
            base = slugify(fallbackName);
        }
        if (base.isBlank()) {
            base = "partner";
        }
        String candidate = base;
        int n = 2;
        while (officialVendorRepository.findBySlug(candidate).isPresent()) {
            candidate = base + "-" + n;
            n++;
        }
        return candidate;
    }

    private String resolveVendorLogoUrl(OfficialVendor vendor) {
        if (vendor.getLogoUrl() != null && !vendor.getLogoUrl().isBlank()) {
            return vendor.getLogoUrl();
        }
        if (vendor.getSlug() == null || vendor.getSlug().isBlank()) {
            return null;
        }
        return userRepository.findByPublicHandleIgnoreCase(vendor.getSlug().trim())
                .map(User::getLogoUrl)
                .filter(url -> url != null && !url.isBlank())
                .orElse(null);
    }

    private Map<String, Object> vendorBrandingMap(OfficialVendor vendor) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("logoUrl", resolveVendorLogoUrl(vendor));
        return out;
    }

    private void deletePreviousVendorLogoAssets(OfficialVendor vendor) {
        if (vendor.getLogoUrl() != null) {
            fileStorageService.deleteFile(vendor.getLogoUrl());
        }
        if (vendor.getLogoBwUrl() != null && !vendor.getLogoBwUrl().equals(vendor.getLogoUrl())) {
            fileStorageService.deleteFile(vendor.getLogoBwUrl());
        }
    }

    private static String slugify(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
    }

    private static String trimTrailingSlash(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        String t = url.trim();
        return t.endsWith("/") ? t.substring(0, t.length() - 1) : t;
    }

    private Map<String, Object> mapLead(OfficialVendorLead lead) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", lead.getId());
        out.put("businessName", lead.getBusinessName());
        out.put("contactName", lead.getContactName() == null ? "" : lead.getContactName());
        out.put("contactEmail", lead.getContactEmail());
        out.put("websiteUrl", lead.getWebsiteUrl() == null ? "" : lead.getWebsiteUrl());
        out.put("country", lead.getCountry() == null ? "" : lead.getCountry());
        out.put("state", lead.getState() == null ? "" : lead.getState());
        out.put("city", lead.getCity() == null ? "" : lead.getCity());
        out.put("shippingScope", lead.getShippingScope() == null ? "" : lead.getShippingScope());
        out.put("note", lead.getNote() == null ? "" : lead.getNote());
        out.put("status", lead.getStatus());
        out.put("outreachLocale", lead.getOutreachLocale() == null ? "en" : lead.getOutreachLocale());
        out.put("internalNotes", lead.getInternalNotes() == null ? "" : lead.getInternalNotes());
        out.put("qualification", lead.getQualification() == null ? Map.of() : lead.getQualification());
        out.put("wooProbeStatus", lead.getWooProbeStatus() == null ? "" : lead.getWooProbeStatus());
        out.put("wooProbeDetail", lead.getWooProbeDetail() == null ? "" : lead.getWooProbeDetail());
        out.put("lastOutreachAt", lead.getLastOutreachAt());
        out.put("createdAt", lead.getCreatedAt());
        out.put("updatedAt", lead.getUpdatedAt());
        return out;
    }

    private List<String> splitCountries(String raw) {
        if (raw == null || raw.isBlank()) return List.of();
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .collect(Collectors.toList());
    }

    private void ensureSeedData() {
        if (officialVendorRepository.count() > 0) return;
        officialVendorRepository.save(seedVendor("become-partner-us-breeder", "Are you a U.S. breeder?", "United States", null, null,
                "https://tarantulapp.com/marketplace#vendor-activation", true, "United States", 95,
                "This featured spot is open. Apply to become an official partner and get listed in front of every U.S. keeper.",
                "Open spot"));
        officialVendorRepository.save(seedVendor("become-partner-mexico-breeder", "¿Eres breeder en México?", "Mexico", null, null,
                "https://tarantulapp.com/marketplace#vendor-activation", true, "Mexico", 94,
                "Este lugar destacado está disponible. Aplica para ser partner oficial y aparecer aquí.",
                "Lugar disponible"));
        officialVendorRepository.save(seedVendor("become-partner-canada-breeder", "Breeder in Canada?", "Canada", null, null,
                "https://tarantulapp.com/marketplace#vendor-activation", true, "Canada", 93,
                "This featured slot is open for a vetted Canadian breeder or shop. Apply to claim it.",
                "Open spot"));
        officialVendorRepository.save(seedVendor("become-partner-exotic-shop", "Run an exotic invert shop?", "United States", null, null,
                "https://tarantulapp.com/marketplace#vendor-activation", true, "United States,Mexico,Canada", 92,
                "Showcase your storefront here. Apply for the official partner program in minutes — our team reviews every request.",
                "Open spot"));
        officialVendorRepository.save(seedVendor("become-partner-international", "Ship internationally?", "International", null, null,
                "https://tarantulapp.com/marketplace#vendor-activation", true, "United States,Mexico,Canada", 91,
                "Cross-border breeders welcome. Submit your operation to be reviewed for verified partner status.",
                "Open spot"));
    }

    private OfficialVendor seedVendor(String slug, String name, String country, String state, String city,
                                      String websiteUrl, boolean nationalShipping, String shipsToCountries,
                                      int influenceScore, String note, String badge) {
        OfficialVendor v = new OfficialVendor();
        v.setSlug(slug);
        v.setName(name);
        v.setCountry(country);
        v.setState(state);
        v.setCity(city);
        v.setWebsiteUrl(websiteUrl);
        v.setNationalShipping(nationalShipping);
        v.setShipsToCountries(shipsToCountries);
        v.setInfluenceScore(influenceScore);
        v.setBadge(badge);
        v.setNote(note);
        v.setEnabled(true);
        v.setPartnerProgramTier(null);
        v.setListingImportEnabled(false);
        v.setIsDemo(false);
        return v;
    }

    private String cleanText(String value, int maxLen) {
        if (value == null) return null;
        String out = value.trim().replaceAll("\\s+", " ");
        if (out.isEmpty()) return null;
        return out.length() > maxLen ? out.substring(0, maxLen) : out;
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim().toLowerCase();
    }
}
