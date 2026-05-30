package com.tarantulapp.service;

import com.tarantulapp.entity.SpeciesGapReport;
import com.tarantulapp.repository.SpeciesGapReportRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Records species names the platform references but the taxonomic catalog is missing, so an admin
 * can be alerted and add them manually. De-duplicates by normalized name and counts occurrences.
 */
@Service
public class SpeciesGapService {

    private static final Logger log = LoggerFactory.getLogger(SpeciesGapService.class);

    private final SpeciesGapReportRepository repository;

    public SpeciesGapService(SpeciesGapReportRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void report(String normalizedName, String sampleRawName, String source) {
        if (normalizedName == null || normalizedName.isBlank()) {
            return;
        }
        String name = normalizedName.trim();
        try {
            repository.findByNormalizedNameIgnoreCase(name).ifPresentOrElse(existing -> {
                if (SpeciesGapReport.OPEN.equals(existing.getStatus())) {
                    existing.setOccurrences(existing.getOccurrences() + 1);
                    existing.setLastSeenAt(Instant.now());
                    if (existing.getSampleRawName() == null && sampleRawName != null) {
                        existing.setSampleRawName(sampleRawName.trim());
                    }
                    repository.save(existing);
                }
            }, () -> {
                SpeciesGapReport gap = new SpeciesGapReport();
                gap.setNormalizedName(name);
                gap.setSampleRawName(sampleRawName == null ? null : sampleRawName.trim());
                gap.setSource(source == null || source.isBlank() ? "partner_sync" : source.trim());
                repository.save(gap);
            });
        } catch (Exception e) {
            // Never let gap bookkeeping break a sync.
            log.debug("Species gap report failed for '{}': {}", name, e.toString());
        }
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listOpen() {
        return repository.findByStatusOrderByOccurrencesDescLastSeenAtDesc(SpeciesGapReport.OPEN)
                .stream().map(SpeciesGapService::toMap).toList();
    }

    @Transactional(readOnly = true)
    public long openCount() {
        return repository.countByStatus(SpeciesGapReport.OPEN);
    }

    @Transactional
    public void resolve(UUID id, Integer speciesId) {
        repository.findById(id).ifPresent(gap -> {
            gap.setStatus(SpeciesGapReport.RESOLVED);
            gap.setResolvedSpeciesId(speciesId);
            gap.setResolvedAt(Instant.now());
            repository.save(gap);
        });
    }

    /** Resolve any open gap whose normalized name matches the newly created species. */
    @Transactional
    public void resolveByName(String scientificName, Integer speciesId) {
        if (scientificName == null) return;
        repository.findByNormalizedNameIgnoreCase(scientificName.trim()).ifPresent(gap -> {
            if (SpeciesGapReport.OPEN.equals(gap.getStatus())) {
                gap.setStatus(SpeciesGapReport.RESOLVED);
                gap.setResolvedSpeciesId(speciesId);
                gap.setResolvedAt(Instant.now());
                repository.save(gap);
            }
        });
    }

    @Transactional
    public void dismiss(UUID id) {
        repository.findById(id).ifPresent(gap -> {
            gap.setStatus(SpeciesGapReport.DISMISSED);
            gap.setResolvedAt(Instant.now());
            repository.save(gap);
        });
    }

    private static Map<String, Object> toMap(SpeciesGapReport g) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", g.getId());
        out.put("normalizedName", g.getNormalizedName());
        out.put("sampleRawName", g.getSampleRawName());
        out.put("source", g.getSource());
        out.put("occurrences", g.getOccurrences());
        out.put("status", g.getStatus());
        out.put("createdAt", g.getCreatedAt());
        out.put("lastSeenAt", g.getLastSeenAt());
        return out;
    }
}
