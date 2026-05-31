package com.tarantulapp.repository;

import com.tarantulapp.entity.OfficialVendorPickupPoint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OfficialVendorPickupPointRepository extends JpaRepository<OfficialVendorPickupPoint, UUID> {
    List<OfficialVendorPickupPoint> findByOfficialVendorId(UUID officialVendorId);
    List<OfficialVendorPickupPoint> findByOfficialVendorIdAndActiveTrue(UUID officialVendorId);
    Optional<OfficialVendorPickupPoint> findByOfficialVendorIdAndPickupPointId(UUID officialVendorId, UUID pickupPointId);
}
