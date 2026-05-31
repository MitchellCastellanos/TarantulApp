package com.tarantulapp.repository;

import com.tarantulapp.entity.PartnerListingPickupPoint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface PartnerListingPickupPointRepository extends JpaRepository<PartnerListingPickupPoint, UUID> {
    List<PartnerListingPickupPoint> findByPartnerListingId(UUID partnerListingId);
    List<PartnerListingPickupPoint> findByPartnerListingIdIn(Collection<UUID> partnerListingIds);
    void deleteByPartnerListingId(UUID partnerListingId);
    void deleteByPickupPointId(UUID pickupPointId);
}
