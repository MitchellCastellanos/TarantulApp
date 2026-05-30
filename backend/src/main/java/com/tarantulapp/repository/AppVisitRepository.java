package com.tarantulapp.repository;

import com.tarantulapp.entity.AppVisit;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AppVisitRepository extends JpaRepository<AppVisit, UUID> {

    Optional<AppVisit> findBySessionId(String sessionId);

    /** Visits whose session started on/after {@code since}, newest first. Aggregated in-memory by the service. */
    @Query("select v from AppVisit v where v.firstSeenAt >= :since order by v.firstSeenAt desc")
    List<AppVisit> findStartedSince(@Param("since") Instant since, Pageable pageable);

    /** All visits, newest first (range = all-time). Capped by the caller's Pageable. */
    @Query("select v from AppVisit v order by v.firstSeenAt desc")
    List<AppVisit> findAllNewestFirst(Pageable pageable);
}
