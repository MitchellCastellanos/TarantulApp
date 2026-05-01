package com.tarantulapp.repository;

import com.tarantulapp.entity.MoltLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MoltLogRepository extends JpaRepository<MoltLog, UUID> {
    List<MoltLog> findByTarantulaIdOrderByMoltedAtDesc(UUID tarantulaId);
    Optional<MoltLog> findFirstByTarantulaIdOrderByMoltedAtDesc(UUID tarantulaId);
    @Query("select count(m) from MoltLog m where m.tarantulaId in (select t.id from Tarantula t where t.userId = :userId)")
    long countByOwnerUserId(UUID userId);

    @Query("""
            select count(m) from MoltLog m
            where m.tarantulaId in (select t.id from Tarantula t where t.userId = :userId)
            and m.moltedAt >= :from
            """)
    long countMoltsSince(@Param("userId") UUID userId, @Param("from") Instant from);

    @Query(value = """
            select date_trunc('week', m.molted_at) as wk, cast(count(*) as bigint)
            from molt_logs m
            inner join tarantulas t on t.id = m.tarantula_id
            where t.user_id = cast(:userId as uuid)
              and m.molted_at >= cast(:fromTs as timestamptz)
            group by wk
            order by wk
            """, nativeQuery = true)
    List<Object[]> countMoltsByWeekNative(@Param("userId") UUID userId, @Param("fromTs") Instant fromTs);
}
