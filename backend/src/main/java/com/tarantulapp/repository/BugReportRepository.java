package com.tarantulapp.repository;

import com.tarantulapp.entity.BugReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BugReportRepository extends JpaRepository<BugReport, UUID> {
    List<BugReport> findByStatusOrderByCreatedAtDesc(String status);
    List<BugReport> findAllByOrderByCreatedAtDesc();
    long countByUserId(UUID userId);
}
