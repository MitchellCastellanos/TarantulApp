package com.tarantulapp.repository;

import com.tarantulapp.entity.SexIdCase;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SexIdCaseRepository extends JpaRepository<SexIdCase, UUID> {

    Page<SexIdCase> findByHiddenAtIsNullOrderByCreatedAtDesc(Pageable pageable);

    Page<SexIdCase> findByAuthorUserIdOrderByCreatedAtDesc(UUID authorUserId, Pageable pageable);
}
