package com.tarantulapp.repository;

import com.tarantulapp.entity.PartnerListing;
import com.tarantulapp.entity.PartnerListingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    @Query("""
            select count(p) from PartnerListing p
            where p.status = :status
              and (
                p.speciesId = :speciesId
                or lower(trim(coalesce(p.speciesNormalized, ''))) = lower(trim(:scientificName))
                or lower(trim(coalesce(p.speciesNameRaw, ''))) = lower(trim(:scientificName))
              )
            """)
    long countActiveForSpecies(@Param("status") PartnerListingStatus status,
                               @Param("speciesId") Integer speciesId,
                               @Param("scientificName") String scientificName);

    @Query("""
            select p from PartnerListing p
            where p.status = :status
              and (
                p.speciesId = :speciesId
                or lower(trim(coalesce(p.speciesNormalized, ''))) = lower(trim(:scientificName))
                or lower(trim(coalesce(p.speciesNameRaw, ''))) = lower(trim(:scientificName))
              )
            order by p.lastSyncedAt desc
            """)
    List<PartnerListing> findRecentActiveForSpecies(@Param("status") PartnerListingStatus status,
                                                    @Param("speciesId") Integer speciesId,
                                                    @Param("scientificName") String scientificName);

    @Modifying
    @Query(value = "delete from partner_listings where external_id like :prefix", nativeQuery = true)
    int deleteDemoByExternalIdPrefix(String prefix);
}
