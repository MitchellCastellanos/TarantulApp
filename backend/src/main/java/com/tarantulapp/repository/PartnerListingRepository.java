package com.tarantulapp.repository;

import com.tarantulapp.entity.PartnerListing;
import com.tarantulapp.entity.PartnerListingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PartnerListingRepository extends JpaRepository<PartnerListing, UUID> {
    Optional<PartnerListing> findByOfficialVendorIdAndExternalId(UUID officialVendorId, String externalId);
    List<PartnerListing> findTop200ByOfficialVendorIdAndStatusOrderByLastSyncedAtDesc(UUID officialVendorId, PartnerListingStatus status);
    List<PartnerListing> findByOfficialVendorId(UUID officialVendorId);
    List<PartnerListing> findTop200ByStatusOrderByLastSyncedAtDesc(PartnerListingStatus status);
    List<PartnerListing> findTop3000ByStatusOrderByPromotedDescLastSyncedAtDesc(PartnerListingStatus status);
    List<PartnerListing> findByOfficialVendorIdAndStatusInOrderByPromotedDescLastSyncedAtDesc(
            UUID officialVendorId, Collection<PartnerListingStatus> statuses);
    long countByOfficialVendorIdAndStatus(UUID officialVendorId, PartnerListingStatus status);
    long countByStatus(PartnerListingStatus status);

    @Modifying
    @Query(value = "delete from partner_listings where external_id like :prefix", nativeQuery = true)
    int deleteDemoByExternalIdPrefix(String prefix);
}
