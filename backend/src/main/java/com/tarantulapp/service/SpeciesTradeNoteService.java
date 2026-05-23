package com.tarantulapp.service;

import com.tarantulapp.entity.Species;
import com.tarantulapp.entity.SpeciesTradeNote;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.SpeciesRepository;
import com.tarantulapp.repository.SpeciesTradeNoteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class SpeciesTradeNoteService {

    private final SpeciesTradeNoteRepository speciesTradeNoteRepository;
    private final SpeciesRepository speciesRepository;

    public SpeciesTradeNoteService(SpeciesTradeNoteRepository speciesTradeNoteRepository,
                                     SpeciesRepository speciesRepository) {
        this.speciesTradeNoteRepository = speciesTradeNoteRepository;
        this.speciesRepository = speciesRepository;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listForSpecies(Integer speciesId) {
        assertSpeciesExists(speciesId);
        return speciesTradeNoteRepository.findBySpeciesIdOrderByCountryAsc(speciesId).stream()
                .map(this::toPublicMap)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<Map<String, Object>> getForSpeciesAndCountry(Integer speciesId, String country) {
        if (speciesId == null || country == null || country.isBlank()) {
            return Optional.empty();
        }
        return speciesTradeNoteRepository.findBySpeciesIdAndCountryIgnoreCase(speciesId, country.trim())
                .map(this::toPublicMap);
    }

    @Transactional(readOnly = true)
    public Optional<Map<String, Object>> getForSpeciesNameAndCountry(String speciesName, String country) {
        return resolveSpeciesId(speciesName).flatMap(id -> getForSpeciesAndCountry(id, country));
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listAllForAdmin() {
        return speciesTradeNoteRepository.findAll().stream()
                .sorted((a, b) -> {
                    int c = Integer.compare(a.getSpeciesId(), b.getSpeciesId());
                    if (c != 0) return c;
                    return a.getCountry().compareToIgnoreCase(b.getCountry());
                })
                .map(this::toAdminMap)
                .toList();
    }

    @Transactional
    public Map<String, Object> upsert(Integer speciesId, String country, String citesAppendix,
                                      String laceyStatus, String notesMd) {
        assertSpeciesExists(speciesId);
        String countryNorm = normalizeCountry(country);
        SpeciesTradeNote note = speciesTradeNoteRepository
                .findBySpeciesIdAndCountryIgnoreCase(speciesId, countryNorm)
                .orElseGet(SpeciesTradeNote::new);
        note.setSpeciesId(speciesId);
        note.setCountry(countryNorm);
        note.setCitesAppendix(trimTo(citesAppendix, 16));
        note.setLaceyStatus(trimTo(laceyStatus, 32));
        note.setNotesMd(trimTo(notesMd, 8000));
        return toAdminMap(speciesTradeNoteRepository.save(note));
    }

    @Transactional
    public void delete(UUID id) {
        if (!speciesTradeNoteRepository.existsById(id)) {
            throw new NotFoundException("Trade note not found");
        }
        speciesTradeNoteRepository.deleteById(id);
    }

    public void enrichListingDetail(Map<String, Object> detail) {
        if (detail == null) return;
        String speciesName = detail.get("speciesName") instanceof String s ? s : null;
        String country = detail.get("country") instanceof String c ? c : null;
        getForSpeciesNameAndCountry(speciesName, country).ifPresent(note ->
                detail.put("speciesTradeNote", note));
    }

    private Optional<Integer> resolveSpeciesId(String speciesName) {
        if (speciesName == null || speciesName.isBlank()) {
            return Optional.empty();
        }
        return speciesRepository.findByScientificNameIgnoreCase(speciesName.trim())
                .filter(DiscoverCatalogService::isPublicCatalogRow)
                .map(Species::getId);
    }

    private void assertSpeciesExists(Integer speciesId) {
        if (speciesId == null || !speciesRepository.existsById(speciesId)) {
            throw new NotFoundException("Species not found");
        }
    }

    private Map<String, Object> toPublicMap(SpeciesTradeNote n) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("country", n.getCountry());
        m.put("citesAppendix", n.getCitesAppendix() == null ? "" : n.getCitesAppendix());
        m.put("laceyStatus", n.getLaceyStatus() == null ? "" : n.getLaceyStatus());
        m.put("notesMd", n.getNotesMd() == null ? "" : n.getNotesMd());
        return m;
    }

    private Map<String, Object> toAdminMap(SpeciesTradeNote n) {
        Map<String, Object> m = new LinkedHashMap<>(toPublicMap(n));
        m.put("id", n.getId());
        m.put("speciesId", n.getSpeciesId());
        m.put("updatedAt", n.getUpdatedAt());
        speciesRepository.findById(n.getSpeciesId()).ifPresent(sp ->
                m.put("scientificName", sp.getScientificName()));
        return m;
    }

    private static String normalizeCountry(String country) {
        if (country == null || country.isBlank()) {
            throw new IllegalArgumentException("country required");
        }
        return country.trim();
    }

    private static String trimTo(String v, int max) {
        if (v == null) return null;
        String t = v.trim();
        if (t.isEmpty()) return null;
        return t.length() <= max ? t : t.substring(0, max);
    }
}
