package com.tarantulapp.repository;

import com.tarantulapp.entity.PartnerListing;
import com.tarantulapp.entity.PartnerListingStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PartnerListingRepository extends JpaRepository<PartnerListing, UUID> {
    Optional<PartnerListing> findByOfficialVendorIdAndExternalId(UUID officialVendorId, String externalId);
    List<PartnerListing> findTop200ByOfficialVendorIdAndStatusOrderByLastSyncedAtDesc(UUID officialVendorId, PartnerListingStatus status);
    List<PartnerListing> findByOfficialVendorId(UUID officialVendorId);
    List<PartnerListing> findTop200ByStatusOrderByLastSyncedAtDesc(PartnerListingStatus status);
}
