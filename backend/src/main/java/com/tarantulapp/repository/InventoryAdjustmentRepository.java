package com.tarantulapp.repository;

import com.tarantulapp.entity.InventoryAdjustment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InventoryAdjustmentRepository extends JpaRepository<InventoryAdjustment, UUID> {

    List<InventoryAdjustment> findByBatchIdOrderByCreatedAtDesc(UUID batchId);
}
