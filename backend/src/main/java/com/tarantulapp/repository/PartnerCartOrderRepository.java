package com.tarantulapp.repository;

import com.tarantulapp.entity.PartnerCartOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PartnerCartOrderRepository extends JpaRepository<PartnerCartOrder, UUID> {

    List<PartnerCartOrder> findTop50ByVendorIdOrderByCreatedAtDesc(UUID vendorId);

    long countByVendorIdAndStatus(UUID vendorId, String status);
}
