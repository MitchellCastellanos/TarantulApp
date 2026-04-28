package com.tarantulapp.repository;

import com.tarantulapp.entity.OfficialVendorLead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface OfficialVendorLeadRepository extends JpaRepository<OfficialVendorLead, UUID> {
    List<OfficialVendorLead> findTop100ByOrderByCreatedAtDesc();

    @Modifying
    @Query(value = "delete from official_vendor_leads where contact_email like :suffix", nativeQuery = true)
    int deleteDemoByEmailSuffix(String suffix);
}
