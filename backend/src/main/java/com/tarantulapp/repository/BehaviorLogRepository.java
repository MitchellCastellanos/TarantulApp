package com.tarantulapp.repository;

import com.tarantulapp.entity.BehaviorLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BehaviorLogRepository extends JpaRepository<BehaviorLog, UUID> {
    List<BehaviorLog> findByTarantulaIdOrderByLoggedAtDesc(UUID tarantulaId);
    Optional<BehaviorLog> findFirstByTarantulaIdOrderByLoggedAtDesc(UUID tarantulaId);
    @Query("select count(b) from BehaviorLog b where b.tarantulaId in (select t.id from Tarantula t where t.userId = :userId)")
    long countByOwnerUserId(UUID userId);

    @Query(value = """
            SELECT tarantula_id, logged_at, mood FROM (
                SELECT b.tarantula_id AS tarantula_id, b.logged_at AS logged_at, b.mood AS mood,
                       ROW_NUMBER() OVER (PARTITION BY b.tarantula_id ORDER BY b.logged_at DESC) AS rn
                FROM behavior_logs b
                WHERE b.tarantula_id IN (:ids)
            ) x WHERE x.rn = 1
            """, nativeQuery = true)
    List<Object[]> findLatestBehaviorRowsByTarantulaIds(@Param("ids") Collection<UUID> ids);
}
