package com.tarantulapp.repository;

import com.tarantulapp.entity.OfficialVendor;
import com.tarantulapp.entity.PartnerProgramTier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OfficialVendorRepository extends JpaRepository<OfficialVendor, UUID> {
    Optional<OfficialVendor> findBySlug(String slug);
    List<OfficialVendor> findByEnabledTrueOrderByInfluenceScoreDescNameAsc();
    Optional<OfficialVendor> findByIdAndPartnerProgramTierAndListingImportEnabledTrue(UUID id, PartnerProgramTier partnerProgramTier);
    List<OfficialVendor> findByPartnerProgramTierAndListingImportEnabledTrueAndEnabledTrueOrderByInfluenceScoreDesc(PartnerProgramTier partnerProgramTier);

    List<OfficialVendor> findByPartnerProgramTierInAndListingImportEnabledTrueAndEnabledTrueOrderByInfluenceScoreDesc(
            Collection<PartnerProgramTier> partnerProgramTiers);
}
