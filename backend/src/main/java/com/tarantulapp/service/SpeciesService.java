package com.tarantulapp.service;

import com.tarantulapp.dto.SpeciesDTO;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.SpeciesRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
public class SpeciesService {

    private final SpeciesRepository speciesRepository;

    public SpeciesService(SpeciesRepository speciesRepository) {
        this.speciesRepository = speciesRepository;
    }

    public List<SpeciesDTO> findAll() {
        return speciesRepository.findAll().stream()
                .map(SpeciesDTO::from)
                .collect(Collectors.toList());
    }

    public SpeciesDTO findById(Integer id) {
        return speciesRepository.findById(id)
                .map(SpeciesDTO::from)
                .orElseThrow(() -> new NotFoundException("Especie no encontrada"));
    }

    /**
     * Cached for 1h (Redis) / 5 min (Caffeine). Species + synonyms only change via the weekly
     * taxonomy discovery job and the staff CSV upload, both of which are infrequent and tolerate
     * a stale read for at most one TTL window.
     */
    @Cacheable(value = "speciesSearch", key = "#root.target.normalizeKey(#query)", unless = "#result.isEmpty()")
    public List<SpeciesDTO> search(String query) {
        if (query == null || query.isBlank()) return findAll();
        return speciesRepository.searchIncludingSynonyms(query)
                .stream().map(SpeciesDTO::from).collect(Collectors.toList());
    }

    /** SpEL helper so cache keys are stable across casing / whitespace variants of the same query. */
    public String normalizeKey(String query) {
        return query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
    }
}
