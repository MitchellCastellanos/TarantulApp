package com.tarantulapp.service.vendors.sync;

import com.tarantulapp.entity.PartnerListingSyncRun;
import com.tarantulapp.entity.PartnerListingSyncRunStatus;

import java.util.List;
import java.util.UUID;

public record PartnerListingSyncVendorReport(
        UUID vendorId,
        String vendorName,
        String vendorSlug,
        PartnerListingSyncRun run,
        List<PartnerListingSyncChangeLine> newItems,
        List<PartnerListingSyncChangeLine> updatedItems,
        List<PartnerListingSyncChangeLine> removedItems,
        int failedCount,
        int skippedCount,
        String syncError
) {
    public boolean hasNotableChanges() {
        if (syncError != null && !syncError.isBlank()) {
            return true;
        }
        if (run != null && run.getStatus() == PartnerListingSyncRunStatus.FAILED) {
            return true;
        }
        if (failedCount > 0) {
            return true;
        }
        return !newItems.isEmpty() || !updatedItems.isEmpty() || !removedItems.isEmpty();
    }
}
