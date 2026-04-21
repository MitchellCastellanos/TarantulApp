package com.tarantulapp.repository;

import com.tarantulapp.entity.ModerationReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ModerationReportRepository extends JpaRepository<ModerationReport, UUID> {
    List<ModerationReport> findByStatusOrderByCreatedAtDesc(String status);
    List<ModerationReport> findTop100ByOrderByCreatedAtDesc();
}
