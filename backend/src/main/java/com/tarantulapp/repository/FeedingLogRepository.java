package com.tarantulapp.repository;

import com.tarantulapp.entity.FeedingLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FeedingLogRepository extends JpaRepository<FeedingLog, UUID> {
    List<FeedingLog> findByTarantulaIdOrderByFedAtDesc(UUID tarantulaId);
    Optional<FeedingLog> findFirstByTarantulaIdOrderByFedAtDesc(UUID tarantulaId);
    @Query("select count(f) from FeedingLog f where f.tarantulaId in (select t.id from Tarantula t where t.userId = :userId)")
    long countByOwnerUserId(UUID userId);

    @Query("""
            select count(f) from FeedingLog f
            where f.tarantulaId in (select t.id from Tarantula t where t.userId = :userId)
            and f.fedAt >= :from
            and (f.accepted is null or f.accepted = true)
            """)
    long countSuccessfulFeedingsSince(@Param("userId") UUID userId, @Param("from") Instant from);

    @Query(value = """
            select date_trunc('week', f.fed_at) as wk, cast(count(*) as bigint)
            from feeding_logs f
            inner join tarantulas t on t.id = f.tarantula_id
            where t.user_id = cast(:userId as uuid)
              and f.fed_at >= cast(:fromTs as timestamptz)
              and (f.accepted is null or f.accepted = true)
            group by wk
            order by wk
            """, nativeQuery = true)
    List<Object[]> countSuccessfulFeedingsByWeekNative(@Param("userId") UUID userId,
                                                      @Param("fromTs") Instant fromTs);
}
