package com.tarantulapp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Integrates with the World Spider Catalog (wsc.nmbe.ch) for authoritative
 * spider taxonomy. WSC is the primary taxonomic source for tarantula species.
 */
@Service
public class WscService {

    private static final Logger log = LoggerFactory.getLogger(WscService.class);
    private static final String WSC_BASE = "https://wsc.nmbe.ch/api";

    private final RestTemplate restTemplate;
    private final SpeciesRepository speciesRepository;
    private final SpeciesSynonymRepository speciesSynonymRepository;
    private final InatService inatService;
    private final ObjectMapper objectMapper = new ObjectMapper();

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
     * Uses flexible JSON parsing to handle any response structure.
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

            // Fetch raw response body for flexible parsing
            ResponseEntity<String> resp = restTemplate.exchange(
                    url, HttpMethod.GET, entity, String.class);

            String body = resp.getBody();
            log.info("WSC search q='{}' status={} body={}",
                    q, resp.getStatusCode(),
                    body != null && body.length() > 600 ? body.substring(0, 600) + "..." : body);

            if (body == null || body.isBlank()) return Collections.emptyList();

            JsonNode root = objectMapper.readTree(body);
            JsonNode rows = findResultArray(root);

            if (rows == null) {
                log.warn("WSC: no result array found. Top-level keys: {}", root.fieldNames());
                return Collections.emptyList();
            }

            List<WscSearchResultDTO> results = new ArrayList<>();
            for (JsonNode row : rows) {
                String name = text(row, "name", "taxon", "scientificName", "canonical_name", "fullName");
                if (name == null || name.isBlank()) continue;

                String status = text(row, "status");
                // If status is present and is NOT an accepted value, skip it
                if (status != null && !status.isBlank()
                        && !"species".equalsIgnoreCase(status)
                        && !"accepted".equalsIgnoreCase(status)
                        && !"valid".equalsIgnoreCase(status)) {
                    continue;
                }

                WscSearchResultDTO dto = new WscSearchResultDTO();
                dto.setName(name);
                dto.setFamily(text(row, "family"));
                dto.setAuthor(text(row, "author"));
                dto.setYear(text(row, "year"));
                dto.setStatus(status);
                dto.setTaxonId(text(row, "taxon_id", "taxonId", "id", "lsid", "wscId"));
                results.add(dto);
                if (results.size() >= 10) break;
            }
            return results;
        } catch (RestClientException e) {
            log.warn("WSC HTTP error for q='{}': {}", q, e.getMessage());
            return Collections.emptyList();
        } catch (Exception e) {
            log.warn("WSC parse error for q='{}': {}", q, e.getMessage());
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
            species.setCareNotes("Family: " + family + ". Imported from World Spider Catalog.");
        } else {
            species.setCareNotes("Imported from World Spider Catalog.");
        }

        // Try to get a reference photo from iNaturalist
        String photoUrl = inatService.fetchPhotoUrl(name);
        if (photoUrl != null) species.setReferencePhotoUrl(photoUrl);

        Species saved = speciesRepository.save(species);
        return SpeciesDTO.from(saved);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /** Finds the first array node in common response wrapper structures. */
    private JsonNode findResultArray(JsonNode root) {
        if (root.isArray()) return root;
        for (String key : new String[]{"data", "results", "species", "records", "items", "taxa"}) {
            JsonNode node = root.get(key);
            if (node != null && node.isArray()) return node;
        }
        return null;
    }

    /** Returns the text of the first matching non-blank field, or null. */
    private String text(JsonNode node, String... fields) {
        for (String field : fields) {
            JsonNode f = node.get(field);
            if (f != null && !f.isNull() && f.isTextual()) {
                String v = f.asText().trim();
                if (!v.isEmpty()) return v;
            }
        }
        return null;
    }
}
