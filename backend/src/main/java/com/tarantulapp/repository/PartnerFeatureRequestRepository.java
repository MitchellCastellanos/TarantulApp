package com.tarantulapp.repository;

import com.tarantulapp.entity.PartnerFeatureRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PartnerFeatureRequestRepository extends JpaRepository<PartnerFeatureRequest, UUID> {
    List<PartnerFeatureRequest> findTop100ByOrderByCreatedAtDesc();
    List<PartnerFeatureRequest> findTop20ByOfficialVendorIdOrderByCreatedAtDesc(UUID officialVendorId);
}
