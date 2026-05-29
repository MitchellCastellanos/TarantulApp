package com.tarantulapp.service.vendors.sync;

import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.entity.PartnerListingAvailability;
import com.tarantulapp.entity.PartnerListingStatus;
import com.tarantulapp.entity.PartnerListingSyncRun;
import com.tarantulapp.entity.PartnerListingSyncRunStatus;
import com.tarantulapp.entity.PartnerListingSyncTriggerSource;
import com.tarantulapp.entity.PartnerProgramTier;
import com.tarantulapp.repository.OfficialVendorRepository;
import com.tarantulapp.repository.PartnerListingSyncRunRepository;
import com.tarantulapp.service.vendors.PartnerListingCatalogRules;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class PartnerListingSyncService {
    private static final Logger log = LoggerFactory.getLogger(PartnerListingSyncService.class);

    private final OfficialVendorRepository officialVendorRepository;
    private final PartnerListingSyncRunRepository partnerListingSyncRunRepository;
    private final PartnerListingUpsertService partnerListingUpsertService;
    private final PartnerListingSyncRunService partnerListingSyncRunService;
    private final PartnerListingSyncReportService partnerListingSyncReportService;
    private final ObjectProvider<PartnerListingSyncItemProvider> itemProvider;
    private static final List<PartnerProgramTier> SYNC_PARTNER_TIERS = List.of(
            PartnerProgramTier.FOUNDING_PARTNER,
            PartnerProgramTier.OFFICIAL_PARTNER,
            PartnerProgramTier.STRATEGIC_FOUNDER,
            PartnerProgramTier.STRATEGIC_PARTNER);

    @Value("${app.partner-sync.enabled:false}")
    private boolean schedulerEnabled;

    @Value("${app.partner-sync.report-on-manual:false}")
    private boolean reportOnManual;

    public PartnerListingSyncService(OfficialVendorRepository officialVendorRepository,
                                     PartnerListingSyncRunRepository partnerListingSyncRunRepository,
                                     PartnerListingUpsertService partnerListingUpsertService,
                                     PartnerListingSyncRunService partnerListingSyncRunService,
                                     PartnerListingSyncReportService partnerListingSyncReportService,
                                     ObjectProvider<PartnerListingSyncItemProvider> itemProvider) {
        this.officialVendorRepository = officialVendorRepository;
        this.partnerListingSyncRunRepository = partnerListingSyncRunRepository;
        this.partnerListingUpsertService = partnerListingUpsertService;
        this.partnerListingSyncRunService = partnerListingSyncRunService;
        this.partnerListingSyncReportService = partnerListingSyncReportService;
        this.itemProvider = itemProvider;
    }

    @Scheduled(cron = "${app.partner-sync.cron:0 0 6,18 * * *}")
    @SchedulerLock(name = "partnerListingSync", lockAtLeastFor = "PT2M", lockAtMostFor = "PT90M")
    public void runScheduledSync() {
        if (!schedulerEnabled) {
            return;
        }
        PartnerListingSyncItemProvider provider = itemProvider.getIfAvailable();
        if (provider == null) {
            log.warn("Partner sync scheduler enabled but no item provider configured");
            return;
        }
        List<OfficialVendor> strategicVendors = eligibleSyncVendors();
        List<PartnerListingSyncVendorReport> reports = new ArrayList<>();
        for (OfficialVendor vendor : strategicVendors) {
            reports.add(syncVendorSafely(provider, vendor, PartnerListingSyncTriggerSource.SCHEDULER));
        }
        partnerListingSyncReportService.sendIfNotable(reports);
        log.info("Partner sync scheduler finished for {} vendors", strategicVendors.size());
    }

    public List<PartnerListingSyncRun> runManualSyncAllStrategic() {
        PartnerListingSyncItemProvider provider = itemProvider.getIfAvailable();
        if (provider == null) {
            return List.of();
        }
        List<OfficialVendor> strategicVendors = eligibleSyncVendors();
        List<PartnerListingSyncRun> runs = new ArrayList<>();
        List<PartnerListingSyncVendorReport> reports = new ArrayList<>();
        for (OfficialVendor vendor : strategicVendors) {
            PartnerListingSyncVendorReport report = syncVendorSafely(provider, vendor, PartnerListingSyncTriggerSource.MANUAL);
            if (report.run() != null) {
                runs.add(report.run());
            }
            reports.add(report);
        }
        if (reportOnManual) {
            partnerListingSyncReportService.sendIfNotable(reports);
        }
        return runs;
    }

    public PartnerListingSyncRun runManualSyncForVendor(UUID vendorId) {
        PartnerListingSyncItemProvider provider = itemProvider.getIfAvailable();
        if (provider == null) {
            throw new IllegalStateException("PARTNER_SYNC_PROVIDER_UNAVAILABLE");
        }
        OfficialVendor vendor = officialVendorRepository.findById(vendorId)
                .orElseThrow(() -> new IllegalArgumentException("VENDOR_NOT_FOUND"));
        if (!Boolean.TRUE.equals(vendor.getListingImportEnabled())) {
            throw new IllegalArgumentException("LISTING_IMPORT_DISABLED");
        }
        PartnerProgramTier tier = vendor.getPartnerProgramTier();
        if (tier == null || !SYNC_PARTNER_TIERS.contains(tier)) {
            throw new IllegalArgumentException("PARTNER_TIER_NOT_ELIGIBLE");
        }
        PartnerListingSyncVendorReport report = syncVendorSafely(provider, vendor, PartnerListingSyncTriggerSource.MANUAL);
        if (reportOnManual) {
            partnerListingSyncReportService.sendIfNotable(List.of(report));
        }
        if (report.run() == null) {
            throw new IllegalStateException("PARTNER_SYNC_RUN_FAILED");
        }
        return report.run();
    }

    @Transactional(readOnly = true)
    public List<PartnerListingSyncRun> recentRuns(UUID vendorId) {
        if (vendorId == null) {
            return partnerListingSyncRunRepository.findAll()
                    .stream()
                    .sorted((a, b) -> b.getStartedAt().compareTo(a.getStartedAt()))
                    .limit(100)
                    .collect(java.util.stream.Collectors.toList());
        }
        return partnerListingSyncRunRepository.findTop50ByOfficialVendorIdOrderByStartedAtDesc(vendorId);
    }

    private List<OfficialVendor> eligibleSyncVendors() {
        return officialVendorRepository
                .findByPartnerProgramTierInAndListingImportEnabledTrueAndEnabledTrueOrderByInfluenceScoreDesc(
                        SYNC_PARTNER_TIERS);
    }

    private PartnerListingSyncVendorReport syncVendorSafely(PartnerListingSyncItemProvider provider,
                                                            OfficialVendor vendor,
                                                            PartnerListingSyncTriggerSource triggerSource) {
        try {
            List<PartnerListingUpsertRequest> items = provider.fetchItems(vendor);
            return syncVendorListings(vendor, items, triggerSource);
        } catch (Exception ex) {
            log.warn("Partner sync failed for vendor {} ({}): {}", vendor.getId(), vendor.getSlug(), ex.getMessage());
            return new PartnerListingSyncVendorReport(
                    vendor.getId(),
                    vendor.getName(),
                    vendor.getSlug(),
                    null,
                    List.of(),
                    List.of(),
                    List.of(),
                    0,
                    0,
                    crop(ex.getMessage(), 1500)
            );
        }
    }

    PartnerListingSyncVendorReport syncVendorListings(OfficialVendor vendor,
                                                      List<PartnerListingUpsertRequest> incomingItems,
                                                      PartnerListingSyncTriggerSource triggerSource) {
        UUID officialVendorId = vendor.getId();
        PartnerListingSyncRun run = partnerListingSyncRunService.startRun(officialVendorId, triggerSource);
        int processed = 0;
        int upserted = 0;
        int failed = 0;
        int skipped = 0;
        int stale = 0;
        List<PartnerListingSyncChangeLine> newItems = new ArrayList<>();
        List<PartnerListingSyncChangeLine> updatedItems = new ArrayList<>();
        List<PartnerListingSyncChangeLine> removedItems = new ArrayList<>();

        boolean loggedItemFailure = false;
        try {
            Set<String> seenExternalIds = new HashSet<>();
            for (PartnerListingUpsertRequest raw : incomingItems == null ? List.<PartnerListingUpsertRequest>of() : incomingItems) {
                processed++;
                try {
                    PartnerListingUpsertRequest normalized = normalizeSyncRules(raw, officialVendorId, vendor);
                    if (normalized == null) {
                        skipped++;
                        continue;
                    }
                    PartnerListingUpsertResult result = partnerListingUpsertService.upsert(normalized);
                    upserted++;
                    seenExternalIds.add(normalized.externalId().trim());
                    switch (result.change()) {
                        case CREATED, RESTORED -> newItems.add(PartnerListingSyncReportService.toLine(result));
                        case UPDATED -> updatedItems.add(PartnerListingSyncReportService.toLine(result));
                        case UNCHANGED -> { /* no report line */ }
                    }
                } catch (Exception itemError) {
                    failed++;
                    if (!loggedItemFailure) {
                        loggedItemFailure = true;
                        log.warn("Partner listing item failed vendor {}: {}", officialVendorId, itemError.getMessage(), itemError);
                    } else if (log.isDebugEnabled()) {
                        log.debug("Partner listing item failed vendor {}: {}", officialVendorId, itemError.getMessage());
                    }
                    if (isAbortedTransaction(itemError)) {
                        log.error(
                                "Partner listing sync aborted for vendor {} after poisoned DB transaction. "
                                        + "Ensure Flyway migration V95 (promoted column) has been applied.",
                                officialVendorId);
                        break;
                    }
                }
            }

            MarkStaleResult staleResult = partnerListingSyncRunService.markMissingAsStale(officialVendorId, seenExternalIds);
            stale = staleResult.count();
            for (StaleListingRef ref : staleResult.items()) {
                removedItems.add(PartnerListingSyncReportService.staleLine(ref));
            }
            int disallowedStale = partnerListingSyncRunService.markDisallowedAsStale(officialVendorId, vendor);
            stale += disallowedStale;

            PartnerListingSyncRun finished = completeRun(run, processed, upserted, failed, skipped, stale);
            return new PartnerListingSyncVendorReport(
                    vendor.getId(),
                    vendor.getName(),
                    vendor.getSlug(),
                    finished,
                    List.copyOf(newItems),
                    List.copyOf(updatedItems),
                    List.copyOf(removedItems),
                    failed,
                    skipped,
                    null
            );
        } catch (Exception ex) {
            run.setStatus(PartnerListingSyncRunStatus.FAILED);
            run.setProcessedCount(processed);
            run.setUpsertedCount(upserted);
            run.setFailedCount(failed + 1);
            run.setSkippedCount(skipped);
            run.setStaleCount(stale);
            run.setErrorMessage(crop(ex.getMessage(), 1500));
            run.setFinishedAt(Instant.now());
            PartnerListingSyncRun finished = partnerListingSyncRunService.finishRun(run);
            return new PartnerListingSyncVendorReport(
                    vendor.getId(),
                    vendor.getName(),
                    vendor.getSlug(),
                    finished,
                    List.copyOf(newItems),
                    List.copyOf(updatedItems),
                    List.copyOf(removedItems),
                    failed + 1,
                    skipped,
                    crop(ex.getMessage(), 1500)
            );
        }
    }

    public PartnerListingSyncRun syncVendorListings(UUID officialVendorId,
                                                    List<PartnerListingUpsertRequest> incomingItems,
                                                    PartnerListingSyncTriggerSource triggerSource) {
        OfficialVendor vendor = officialVendorRepository.findById(officialVendorId)
                .orElseThrow(() -> new IllegalArgumentException("Vendor no encontrado"));
        return syncVendorListings(vendor, incomingItems, triggerSource).run();
    }

    private PartnerListingSyncRun completeRun(PartnerListingSyncRun run,
                                              int processed,
                                              int upserted,
                                              int failed,
                                              int skipped,
                                              int stale) {
        run.setStatus(resolveStatus(failed, skipped, upserted));
        run.setProcessedCount(processed);
        run.setUpsertedCount(upserted);
        run.setFailedCount(failed);
        run.setSkippedCount(skipped);
        run.setStaleCount(stale);
        run.setFinishedAt(Instant.now());
        return partnerListingSyncRunService.finishRun(run);
    }

    private boolean isAbortedTransaction(Throwable error) {
        Throwable current = error;
        while (current != null) {
            String message = current.getMessage();
            if (message != null && message.contains("current transaction is aborted")) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private PartnerListingSyncRunStatus resolveStatus(int failed, int skipped, int upserted) {
        if (failed > 0 && upserted == 0) {
            return PartnerListingSyncRunStatus.FAILED;
        }
        if (failed > 0 || skipped > 0) {
            return PartnerListingSyncRunStatus.PARTIAL;
        }
        return PartnerListingSyncRunStatus.SUCCESS;
    }

    private PartnerListingUpsertRequest normalizeSyncRules(PartnerListingUpsertRequest raw, UUID vendorId, OfficialVendor vendor) {
        if (raw == null) return null;
        String externalId = raw.externalId() == null ? null : raw.externalId().trim();
        if (externalId == null || externalId.isEmpty()) return null;

        if (!PartnerListingCatalogRules.isAllowedListing(
                raw.title(), raw.description(), raw.listingCategory(), vendor.getFeedConfig())) {
            return null;
        }

        PartnerListingAvailability availability = raw.availability() == null
                ? PartnerListingAvailability.UNKNOWN
                : raw.availability();
        PartnerListingStatus status = raw.status() == null
                ? PartnerListingStatus.ACTIVE
                : raw.status();

        if (raw.stockQuantity() != null && raw.stockQuantity() <= 0) {
            availability = PartnerListingAvailability.OUT_OF_STOCK;
        }

        return new PartnerListingUpsertRequest(
                vendorId,
                externalId,
                raw.title(),
                raw.description(),
                raw.speciesNameRaw(),
                raw.speciesNormalized(),
                raw.speciesId(),
                raw.priceAmount(),
                raw.currency(),
                raw.stockQuantity(),
                availability,
                raw.imageUrl(),
                raw.productCanonicalUrl(),
                raw.country(),
                raw.state(),
                raw.city(),
                raw.lastSyncedAt() == null ? Instant.now() : raw.lastSyncedAt(),
                status,
                raw.listingCategory(),
                raw.promoted()
        );
    }

    private String crop(String value, int max) {
        if (value == null || value.isBlank()) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }
}
