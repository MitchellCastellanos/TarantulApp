package com.tarantulapp.service.vendors.sync;

import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.entity.PartnerListing;
import com.tarantulapp.entity.PartnerListingAvailability;
import com.tarantulapp.entity.PartnerListingStatus;
import com.tarantulapp.entity.PartnerListingSyncRun;
import com.tarantulapp.entity.PartnerListingSyncRunStatus;
import com.tarantulapp.entity.PartnerListingSyncTriggerSource;
import com.tarantulapp.entity.PartnerProgramTier;
import com.tarantulapp.repository.OfficialVendorRepository;
import com.tarantulapp.repository.PartnerListingRepository;
import com.tarantulapp.repository.PartnerListingSyncRunRepository;
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
    private final PartnerListingRepository partnerListingRepository;
    private final PartnerListingSyncRunRepository partnerListingSyncRunRepository;
    private final PartnerListingUpsertService partnerListingUpsertService;
    private final ObjectProvider<PartnerListingSyncItemProvider> itemProvider;

    @Value("${app.partner-sync.enabled:false}")
    private boolean schedulerEnabled;

    public PartnerListingSyncService(OfficialVendorRepository officialVendorRepository,
                                     PartnerListingRepository partnerListingRepository,
                                     PartnerListingSyncRunRepository partnerListingSyncRunRepository,
                                     PartnerListingUpsertService partnerListingUpsertService,
                                     ObjectProvider<PartnerListingSyncItemProvider> itemProvider) {
        this.officialVendorRepository = officialVendorRepository;
        this.partnerListingRepository = partnerListingRepository;
        this.partnerListingSyncRunRepository = partnerListingSyncRunRepository;
        this.partnerListingUpsertService = partnerListingUpsertService;
        this.itemProvider = itemProvider;
    }

    @Scheduled(cron = "${app.partner-sync.cron:0 */30 * * * *}")
    public void runScheduledSync() {
        if (!schedulerEnabled) {
            return;
        }
        PartnerListingSyncItemProvider provider = itemProvider.getIfAvailable();
        if (provider == null) {
            log.warn("Partner sync scheduler enabled but no item provider configured");
            return;
        }
        List<OfficialVendor> strategicVendors = officialVendorRepository
                .findByPartnerProgramTierInAndListingImportEnabledTrueAndEnabledTrueOrderByInfluenceScoreDesc(
                        List.of(PartnerProgramTier.STRATEGIC_FOUNDER, PartnerProgramTier.STRATEGIC_PARTNER));
        for (OfficialVendor vendor : strategicVendors) {
            try {
                List<PartnerListingUpsertRequest> items = provider.fetchItems(vendor);
                syncVendorListings(vendor.getId(), items, PartnerListingSyncTriggerSource.SCHEDULER);
            } catch (Exception ex) {
                log.warn("Partner sync failed for vendor {}: {}", vendor.getId(), ex.getMessage());
            }
        }
    }

    @Transactional
    public List<PartnerListingSyncRun> runManualSyncAllStrategic() {
        PartnerListingSyncItemProvider provider = itemProvider.getIfAvailable();
        if (provider == null) {
            return List.of();
        }
        List<OfficialVendor> strategicVendors = officialVendorRepository
                .findByPartnerProgramTierInAndListingImportEnabledTrueAndEnabledTrueOrderByInfluenceScoreDesc(
                        List.of(PartnerProgramTier.STRATEGIC_FOUNDER, PartnerProgramTier.STRATEGIC_PARTNER));
        List<PartnerListingSyncRun> runs = new ArrayList<>();
        for (OfficialVendor vendor : strategicVendors) {
            try {
                List<PartnerListingUpsertRequest> items = provider.fetchItems(vendor);
                runs.add(syncVendorListings(vendor.getId(), items, PartnerListingSyncTriggerSource.MANUAL));
            } catch (Exception ex) {
                log.warn("Manual partner sync failed for vendor {}: {}", vendor.getId(), ex.getMessage());
            }
        }
        return runs;
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

    @Transactional
    public PartnerListingSyncRun syncVendorListings(UUID officialVendorId,
                                                    List<PartnerListingUpsertRequest> incomingItems,
                                                    PartnerListingSyncTriggerSource triggerSource) {
        PartnerListingSyncRun run = startRun(officialVendorId, triggerSource);
        int processed = 0;
        int upserted = 0;
        int failed = 0;
        int skipped = 0;
        int stale = 0;

        try {
            Set<String> seenExternalIds = new HashSet<>();
            for (PartnerListingUpsertRequest raw : incomingItems == null ? List.<PartnerListingUpsertRequest>of() : incomingItems) {
                processed++;
                try {
                    PartnerListingUpsertRequest normalized = normalizeSyncRules(raw, officialVendorId);
                    if (normalized == null) {
                        skipped++;
                        continue;
                    }
                    partnerListingUpsertService.upsert(normalized);
                    upserted++;
                    seenExternalIds.add(normalized.externalId().trim());
                } catch (Exception itemError) {
                    failed++;
                    log.warn("Partner listing item failed vendor {}: {}", officialVendorId, itemError.getMessage());
                }
            }

            stale = markMissingAsStale(officialVendorId, seenExternalIds);
            run.setStatus(resolveStatus(failed, skipped, upserted));
            run.setProcessedCount(processed);
            run.setUpsertedCount(upserted);
            run.setFailedCount(failed);
            run.setSkippedCount(skipped);
            run.setStaleCount(stale);
            run.setFinishedAt(Instant.now());
            return partnerListingSyncRunRepository.save(run);
        } catch (Exception ex) {
            run.setStatus(PartnerListingSyncRunStatus.FAILED);
            run.setProcessedCount(processed);
            run.setUpsertedCount(upserted);
            run.setFailedCount(failed + 1);
            run.setSkippedCount(skipped);
            run.setStaleCount(stale);
            run.setErrorMessage(crop(ex.getMessage(), 1500));
            run.setFinishedAt(Instant.now());
            return partnerListingSyncRunRepository.save(run);
        }
    }

    private PartnerListingSyncRun startRun(UUID vendorId, PartnerListingSyncTriggerSource triggerSource) {
        PartnerListingSyncRun run = new PartnerListingSyncRun();
        run.setOfficialVendorId(vendorId);
        run.setTriggerSource(triggerSource == null ? PartnerListingSyncTriggerSource.MANUAL : triggerSource);
        run.setStatus(PartnerListingSyncRunStatus.RUNNING);
        run.setStartedAt(Instant.now());
        return partnerListingSyncRunRepository.save(run);
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

    private int markMissingAsStale(UUID vendorId, Set<String> seenExternalIds) {
        int stale = 0;
        List<PartnerListing> current = partnerListingRepository.findByOfficialVendorId(vendorId);
        Instant now = Instant.now();
        for (PartnerListing listing : current) {
            String ext = listing.getExternalId() == null ? "" : listing.getExternalId().trim();
            if (!seenExternalIds.contains(ext) && listing.getStatus() != PartnerListingStatus.STALE) {
                listing.setStatus(PartnerListingStatus.STALE);
                listing.setLastSyncedAt(now);
                partnerListingRepository.save(listing);
                stale++;
            }
        }
        return stale;
    }

    private PartnerListingUpsertRequest normalizeSyncRules(PartnerListingUpsertRequest raw, UUID vendorId) {
        if (raw == null) return null;
        String externalId = raw.externalId() == null ? null : raw.externalId().trim();
        if (externalId == null || externalId.isEmpty()) return null;

        PartnerListingAvailability availability = raw.availability() == null
                ? PartnerListingAvailability.UNKNOWN
                : raw.availability();
        PartnerListingStatus status = raw.status() == null
                ? PartnerListingStatus.ACTIVE
                : raw.status();

        if (raw.stockQuantity() != null && raw.stockQuantity() <= 0) {
            availability = PartnerListingAvailability.OUT_OF_STOCK;
            status = PartnerListingStatus.HIDDEN;
        }
        if (availability == PartnerListingAvailability.OUT_OF_STOCK && status == PartnerListingStatus.ACTIVE) {
            status = PartnerListingStatus.HIDDEN;
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
                status
        );
    }

    private String crop(String value, int max) {
        if (value == null || value.isBlank()) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }
}
