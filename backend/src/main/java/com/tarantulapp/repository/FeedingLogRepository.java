package com.tarantulapp.repository;

import com.tarantulapp.entity.FeedingLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FeedingLogRepository extends JpaRepository<FeedingLog, UUID> {
    List<FeedingLog> findByTarantulaIdOrderByFedAtDesc(UUID tarantulaId);
    Optional<FeedingLog> findFirstByTarantulaIdOrderByFedAtDesc(UUID tarantulaId);
    @Query("select count(f) from FeedingLog f where f.tarantulaId in (select t.id from Tarantula t where t.userId = :userId)")
    long countByOwnerUserId(UUID userId);
}
