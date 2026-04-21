package com.tarantulapp.repository;

import com.tarantulapp.entity.BehaviorLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BehaviorLogRepository extends JpaRepository<BehaviorLog, UUID> {
    List<BehaviorLog> findByTarantulaIdOrderByLoggedAtDesc(UUID tarantulaId);
    Optional<BehaviorLog> findFirstByTarantulaIdOrderByLoggedAtDesc(UUID tarantulaId);
    @Query("select count(b) from BehaviorLog b where b.tarantulaId in (select t.id from Tarantula t where t.userId = :userId)")
    long countByOwnerUserId(UUID userId);
}
