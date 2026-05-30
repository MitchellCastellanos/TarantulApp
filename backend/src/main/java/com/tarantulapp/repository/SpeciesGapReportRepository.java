package com.tarantulapp.repository;

import com.tarantulapp.entity.SpeciesGapReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SpeciesGapReportRepository extends JpaRepository<SpeciesGapReport, UUID> {

    Optional<SpeciesGapReport> findByNormalizedNameIgnoreCase(String normalizedName);

    List<SpeciesGapReport> findByStatusOrderByOccurrencesDescLastSeenAtDesc(String status);

    long countByStatus(String status);
}
