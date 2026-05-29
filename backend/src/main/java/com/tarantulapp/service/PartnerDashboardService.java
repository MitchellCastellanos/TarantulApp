package com.tarantulapp.service;

import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.entity.PartnerListingStatus;
import com.tarantulapp.entity.PartnerListingSyncRun;
import com.tarantulapp.repository.OfficialVendorRepository;
import com.tarantulapp.repository.PartnerListingRepository;
import com.tarantulapp.service.vendors.sync.PartnerListingSyncService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class PartnerDashboardService {

    private final OfficialVendorService officialVendorService;
    private final PartnerListingSyncService partnerListingSyncService;
    private final PartnerListingRepository partnerListingRepository;
    private final OfficialVendorRepository officialVendorRepository;

    public PartnerDashboardService(OfficialVendorService officialVendorService,
                                   PartnerListingSyncService partnerListingSyncService,
                                   PartnerListingRepository partnerListingRepository,
                                   OfficialVendorRepository officialVendorRepository) {
        this.officialVendorService = officialVendorService;
        this.partnerListingSyncService = partnerListingSyncService;
        this.partnerListingRepository = partnerListingRepository;
        this.officialVendorRepository = officialVendorRepository;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getAdminDashboard() {
        Map<String, Object> out = new LinkedHashMap<>();
        List<Map<String, Object>> vendors = officialVendorService.adminListVendors();
        Map<UUID, OfficialVendor> vendorById = officialVendorRepository.findAll().stream()
                .collect(Collectors.toMap(OfficialVendor::getId, v -> v, (a, b) -> a));

        out.put("closureStatus", officialVendorService.adminEcosystemClosureStatus());
        out.put("vendors", vendors);
        out.put("summary", buildSummary(vendors));
        out.put("recentSyncRuns", partnerListingSyncService.recentRuns(null).stream()
                .limit(50)
                .map(run -> mapSyncRun(run, vendorById))
                .collect(Collectors.toList()));
        return out;
    }

    private Map<String, Object> buildSummary(List<Map<String, Object>> vendors) {
        Map<String, Object> summary = new LinkedHashMap<>();
        long enabledPartners = vendors.stream().filter(v -> Boolean.TRUE.equals(v.get("enabled"))).count();
        long importEnabled = vendors.stream().filter(v -> Boolean.TRUE.equals(v.get("listingImportEnabled"))).count();
        summary.put("totalPartners", vendors.size());
        summary.put("enabledPartners", enabledPartners);
        summary.put("importEnabledCount", importEnabled);
        summary.put("activeListingCount", partnerListingRepository.countByStatus(PartnerListingStatus.ACTIVE));
        return summary;
    }

    private Map<String, Object> mapSyncRun(PartnerListingSyncRun run, Map<UUID, OfficialVendor> vendorById) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", run.getId());
        out.put("officialVendorId", run.getOfficialVendorId());
        OfficialVendor vendor = vendorById.get(run.getOfficialVendorId());
        out.put("vendorName", vendor == null || vendor.getName() == null ? "" : vendor.getName());
        out.put("vendorSlug", vendor == null || vendor.getSlug() == null ? "" : vendor.getSlug());
        out.put("triggerSource", run.getTriggerSource().name().toLowerCase(Locale.ROOT));
        out.put("status", run.getStatus().name().toLowerCase(Locale.ROOT));
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
