package com.tarantulapp.repository;

import com.tarantulapp.entity.MoltLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MoltLogRepository extends JpaRepository<MoltLog, UUID> {
    List<MoltLog> findByTarantulaIdOrderByMoltedAtDesc(UUID tarantulaId);
    Optional<MoltLog> findFirstByTarantulaIdOrderByMoltedAtDesc(UUID tarantulaId);
    @Query("select count(m) from MoltLog m where m.tarantulaId in (select t.id from Tarantula t where t.userId = :userId)")
    long countByOwnerUserId(UUID userId);
}
