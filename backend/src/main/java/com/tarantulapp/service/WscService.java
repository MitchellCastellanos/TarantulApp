package com.tarantulapp.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.tarantulapp.dto.SpeciesDTO;
import com.tarantulapp.dto.WscSearchResultDTO;
import com.tarantulapp.entity.Species;
import com.tarantulapp.entity.SpeciesSynonym;
import com.tarantulapp.repository.SpeciesRepository;
import com.tarantulapp.repository.SpeciesSynonymRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Integrates with the World Spider Catalog (wsc.nmbe.ch) for authoritative
 * spider taxonomy. WSC is the primary taxonomic source for tarantula species.
 */
@Service
public class WscService {

    private static final Logger log = LoggerFactory.getLogger(WscService.class);
    // WSC offers a public REST API — no key required
    private static final String WSC_BASE = "https://wsc.nmbe.ch/api";

    private final RestTemplate restTemplate;
    private final SpeciesRepository speciesRepository;
    private final SpeciesSynonymRepository speciesSynonymRepository;
    private final InatService inatService;

    public WscService(RestTemplate restTemplate,
                      SpeciesRepository speciesRepository,
                      SpeciesSynonymRepository speciesSynonymRepository,
                      InatService inatService) {
        this.restTemplate = restTemplate;
        this.speciesRepository = speciesRepository;
        this.speciesSynonymRepository = speciesSynonymRepository;
        this.inatService = inatService;
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Searches WSC for species matching the query.
     * Returns only accepted names (status == "species").
     */
    public List<WscSearchResultDTO> search(String q) {
        if (q == null || q.isBlank()) return Collections.emptyList();
        try {
            String url = UriComponentsBuilder
                    .fromHttpUrl(WSC_BASE + "/search/species")
                    .queryParam("q", q)
                    .queryParam("format", "json")
                    .toUriString();

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "TarantulApp/1.0 (tarantula collection tracker)");
            headers.set("Accept", "application/json");
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<WscSearchResponse> resp = restTemplate.exchange(
                    url, HttpMethod.GET, entity, WscSearchResponse.class);
            WscSearchResponse response = resp.getBody();

            // WSC may wrap results in "data" or "results"
            List<WscRow> rows = (response != null && response.getData() != null)
                    ? response.getData()
                    : (response != null && response.getResults() != null ? response.getResults() : null);

            if (rows == null) return Collections.emptyList();

            return rows.stream()
                    .filter(row -> row.getName() != null && !row.getName().isBlank())
                    .filter(row -> row.getStatus() == null
                            || "species".equalsIgnoreCase(row.getStatus())
                            || "accepted".equalsIgnoreCase(row.getStatus()))
                    .map(row -> {
                        WscSearchResultDTO dto = new WscSearchResultDTO();
                        dto.setTaxonId(row.getTaxonId());
                        dto.setName(row.getName());
                        dto.setFamily(row.getFamily());
                        dto.setAuthor(row.getAuthor());
                        dto.setYear(row.getYear());
                        dto.setStatus(row.getStatus());
                        return dto;
                    })
                    .limit(10)
                    .collect(Collectors.toList());
        } catch (RestClientException e) {
            log.warn("WSC search failed for q={}: {}", q, e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Imports a species from WSC into the local database.
     * If it already exists (by name or synonym), returns the existing record.
     */
    public SpeciesDTO importSpecies(String name, String family, UUID userId) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Species name is required");
        }

        // Already in DB by scientific name?
        Optional<Species> existing = speciesRepository.findByScientificNameIgnoreCase(name);
        if (existing.isPresent()) return SpeciesDTO.from(existing.get());

        // Already in DB as a synonym?
        Optional<SpeciesSynonym> existingSyn = speciesSynonymRepository.findBySynonymIgnoreCase(name);
        if (existingSyn.isPresent()) {
            return speciesRepository.findById(existingSyn.get().getSpeciesId())
                    .map(SpeciesDTO::from)
                    .orElseThrow();
        }

        // Create new species from WSC data
        Species species = new Species();
        species.setScientificName(name);
        species.setIsCustom(true);
        species.setCreatedBy(userId);
        species.setDataSource("wsc");
        if (family != null && !family.isBlank()) {
            // Store family in careNotes since we don't have a dedicated field
            species.setCareNotes("Familia: " + family + ". Importado desde World Spider Catalog.");
        } else {
            species.setCareNotes("Importado desde World Spider Catalog.");
        }

        // Try to get a reference photo from iNaturalist
        String photoUrl = inatService.fetchPhotoUrl(name);
        if (photoUrl != null) species.setReferencePhotoUrl(photoUrl);

        Species saved = speciesRepository.save(species);
        return SpeciesDTO.from(saved);
    }

    // ─── Inner response wrappers ──────────────────────────────────────────────

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class WscSearchResponse {
        private List<WscRow> data;
        private List<WscRow> results; // fallback key name

        public List<WscRow> getData() { return data; }
        public void setData(List<WscRow> d) { this.data = d; }
        public List<WscRow> getResults() { return results; }
        public void setResults(List<WscRow> r) { this.results = r; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class WscRow {
        // WSC may use either camelCase or snake_case — accept both
        @JsonProperty("taxon_id")
        private String taxonId;

        // "name" is the canonical scientific name in WSC JSON
        private String name;

        private String family;
        private String author;
        private String year;

        // WSC uses "status" field: "species" = accepted
        private String status;

        public String getTaxonId() { return taxonId; }
        public void setTaxonId(String t) { this.taxonId = t; }
        public String getName() { return name; }
        public void setName(String n) { this.name = n; }
        public String getFamily() { return family; }
        public void setFamily(String f) { this.family = f; }
        public String getAuthor() { return author; }
        public void setAuthor(String a) { this.author = a; }
        public String getYear() { return year; }
        public void setYear(String y) { this.year = y; }
        public String getStatus() { return status; }
        public void setStatus(String s) { this.status = s; }
    }
}
