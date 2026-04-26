package com.tarantulapp.repository;

import com.tarantulapp.entity.TarantulaSpood;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TarantulaSpoodRepository extends JpaRepository<TarantulaSpood, UUID> {
    long countByTarantulaId(UUID tarantulaId);
    boolean existsByTarantulaIdAndUserId(UUID tarantulaId, UUID userId);
    Optional<TarantulaSpood> findByTarantulaIdAndUserId(UUID tarantulaId, UUID userId);
    void deleteByTarantulaIdAndUserId(UUID tarantulaId, UUID userId);
}
