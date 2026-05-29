package com.tarantulapp.repository;

import com.tarantulapp.entity.InventoryBatch;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InventoryBatchRepository extends JpaRepository<InventoryBatch, UUID> {

    @EntityGraph(attributePaths = "species")
    List<InventoryBatch> findByUserIdOrderByCreatedAtDesc(UUID userId);

    @EntityGraph(attributePaths = "species")
    Optional<InventoryBatch> findByIdAndUserId(UUID id, UUID userId);
}
