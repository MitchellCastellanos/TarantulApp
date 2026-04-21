package com.tarantulapp.repository;

import com.tarantulapp.entity.OfficialVendorLead;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface OfficialVendorLeadRepository extends JpaRepository<OfficialVendorLead, UUID> {
    List<OfficialVendorLead> findTop100ByOrderByCreatedAtDesc();
}
