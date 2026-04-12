package com.tarantulapp.repository;

import com.tarantulapp.entity.FeedingLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FeedingLogRepository extends JpaRepository<FeedingLog, UUID> {
    List<FeedingLog> findByTarantulaIdOrderByFedAtDesc(UUID tarantulaId);
    Optional<FeedingLog> findFirstByTarantulaIdOrderByFedAtDesc(UUID tarantulaId);
}
