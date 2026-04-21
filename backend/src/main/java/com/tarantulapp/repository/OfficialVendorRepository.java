package com.tarantulapp.repository;

import com.tarantulapp.entity.OfficialVendor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OfficialVendorRepository extends JpaRepository<OfficialVendor, UUID> {
    Optional<OfficialVendor> findBySlug(String slug);
    List<OfficialVendor> findByEnabledTrueOrderByInfluenceScoreDescNameAsc();
}
