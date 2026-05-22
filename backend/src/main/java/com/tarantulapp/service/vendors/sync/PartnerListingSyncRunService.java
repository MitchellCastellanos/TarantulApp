package com.tarantulapp.service.vendors.sync;

import com.tarantulapp.entity.PartnerListing;
import com.tarantulapp.entity.PartnerListingStatus;
import com.tarantulapp.entity.PartnerListingSyncRun;
import com.tarantulapp.entity.PartnerListingSyncRunStatus;
import com.tarantulapp.entity.PartnerListingSyncTriggerSource;
import com.tarantulapp.repository.PartnerListingRepository;
import com.tarantulapp.repository.PartnerListingSyncRunRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class PartnerListingSyncRunService {

    private final PartnerListingRepository partnerListingRepository;
    private final PartnerListingSyncRunRepository partnerListingSyncRunRepository;

    public PartnerListingSyncRunService(PartnerListingRepository partnerListingRepository,
                                        PartnerListingSyncRunRepository partnerListingSyncRunRepository) {
        this.partnerListingRepository = partnerListingRepository;
        this.partnerListingSyncRunRepository = partnerListingSyncRunRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PartnerListingSyncRun startRun(UUID vendorId, PartnerListingSyncTriggerSource triggerSource) {
        PartnerListingSyncRun run = new PartnerListingSyncRun();
        run.setOfficialVendorId(vendorId);
        run.setTriggerSource(triggerSource == null ? PartnerListingSyncTriggerSource.MANUAL : triggerSource);
        run.setStatus(PartnerListingSyncRunStatus.RUNNING);
        run.setStartedAt(Instant.now());
        return partnerListingSyncRunRepository.save(run);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int markMissingAsStale(UUID vendorId, Set<String> seenExternalIds) {
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

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public PartnerListingSyncRun finishRun(PartnerListingSyncRun run) {
        return partnerListingSyncRunRepository.save(run);
    }
}
