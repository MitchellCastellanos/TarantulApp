package com.tarantulapp.repository;

import com.tarantulapp.entity.BehaviorLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BehaviorLogRepository extends JpaRepository<BehaviorLog, UUID> {
    List<BehaviorLog> findByTarantulaIdOrderByLoggedAtDesc(UUID tarantulaId);
    Optional<BehaviorLog> findFirstByTarantulaIdOrderByLoggedAtDesc(UUID tarantulaId);
}
