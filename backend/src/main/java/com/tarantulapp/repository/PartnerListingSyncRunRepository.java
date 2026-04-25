package com.tarantulapp.repository;

import com.tarantulapp.entity.PartnerListingSyncRun;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PartnerListingSyncRunRepository extends JpaRepository<PartnerListingSyncRun, UUID> {
    List<PartnerListingSyncRun> findTop50ByOfficialVendorIdOrderByStartedAtDesc(UUID officialVendorId);
}
