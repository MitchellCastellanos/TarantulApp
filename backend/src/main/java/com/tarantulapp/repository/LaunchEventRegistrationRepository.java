package com.tarantulapp.repository;

import com.tarantulapp.entity.LaunchEventRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LaunchEventRegistrationRepository extends JpaRepository<LaunchEventRegistration, UUID> {

    @Query("select count(r) from LaunchEventRegistration r where r.status = :status")
    long countByStatus(LaunchEventRegistration.Status status);

    @Query("select coalesce(max(r.reservationIndex), 0) from LaunchEventRegistration r where r.status = 'RESERVED'")
    int findMaxReservationIndex();

    @Query("select r from LaunchEventRegistration r where lower(r.email) = lower(:email)")
    Optional<LaunchEventRegistration> findByEmailIgnoreCase(String email);

    @Query("""
        select r from LaunchEventRegistration r
        where r.status = :status
          and r.willAttend = true
          and r.createdAt >= :createdAfter
    """)
    List<LaunchEventRegistration> findRecentByStatus(LaunchEventRegistration.Status status, Instant createdAfter);

    List<LaunchEventRegistration> findByStatusAndWillAttendTrue(LaunchEventRegistration.Status status);
}
