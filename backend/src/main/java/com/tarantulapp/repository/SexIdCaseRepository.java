package com.tarantulapp.repository;

import com.tarantulapp.entity.SexIdCase;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface SexIdCaseRepository extends JpaRepository<SexIdCase, UUID> {

    Page<SexIdCase> findByHiddenAtIsNullOrderByCreatedAtDesc(Pageable pageable);

    Page<SexIdCase> findByAuthorUserIdOrderByCreatedAtDesc(UUID authorUserId, Pageable pageable);

    @Query("select c from SexIdCase c where c.hiddenAt is null and c.status = 'OPEN' and c.votingClosesAt <= :now")
    List<SexIdCase> findOpenDueToClose(Instant now);

    List<SexIdCase> findByHiddenAtIsNullAndStatus(String status);

    long countByAuthorUserId(UUID authorUserId);

    long countByAuthorUserIdAndStatus(UUID authorUserId, String status);
}
