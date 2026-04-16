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
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * World Spider Catalog integration.
 *
 * The WSC public REST API requires an API key and has no free text-search endpoint.
 * Instead, we query WSC data through GBIF, which hosts the full WSC dataset as a
 * checklist (datasetKey = 80dd9c94-241b-4d49-999f-c89de7648525). This gives us
 * authoritative WSC taxonomy through GBIF's free, unauthenticated API.
 */
@Service
public class WscService {

    private static final Logger log = LoggerFactory.getLogger(WscService.class);

    /** GBIF dataset key for the World Spider Catalog checklist. */
    private static final String WSC_DATASET_KEY = "80dd9c94-241b-4d49-999f-c89de7648525";
    private static final String GBIF_SPECIES_SEARCH = "https://api.gbif.org/v1/species/search";
    private static final String GBIF_SPECIES_MATCH = "https://api.gbif.org/v1/species/match";
    private static final String GBIF_SPECIES_DETAIL = "https://api.gbif.org/v1/species";

    private static final Pattern YEAR_PATTERN = Pattern.compile("(\\d{4})");

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
     * Searches for species within the WSC checklist via GBIF.
     * Only returns accepted names.
     */
    public List<WscSearchResultDTO> search(String q) {
        if (q == null || q.isBlank()) return Collections.emptyList();
        try {
            String url = UriComponentsBuilder
                    .fromHttpUrl(GBIF_SPECIES_SEARCH)
                    .queryParam("q", q)
                    .queryParam("datasetKey", WSC_DATASET_KEY)
                    .queryParam("status", "ACCEPTED")
                    .queryParam("rank", "SPECIES")
                    .queryParam("limit", "10")
                    .toUriString();

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "TarantulApp/1.0 (tarantula collection tracker)");
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            ResponseEntity<String> resp = restTemplate.exchange(
                    url, HttpMethod.GET, entity, String.class);

            String body = resp.getBody();
            if (body == null || body.isBlank()) return Collections.emptyList();

            JsonNode root = objectMapper.readTree(body);
            JsonNode results = root.get("results");
            if (results == null || !results.isArray()) return Collections.emptyList();

            List<WscSearchResultDTO> list = new ArrayList<>();
            for (JsonNode item : results) {
                mapToDto(item).ifPresent(list::add);
            }

            // Fallback for synonym/legacy names that search does not return.
            Optional<WscSearchResultDTO> matched = resolveFromMatch(q);
            if (matched.isPresent()) {
                WscSearchResultDTO dto = matched.get();
                boolean alreadyPresent = list.stream()
                        .map(WscSearchResultDTO::getTaxonId)
                        .filter(Objects::nonNull)
                        .anyMatch(id -> id.equals(dto.getTaxonId()));
                if (!alreadyPresent) {
                    list.add(0, dto);
                }
            }

            // Keep list compact and predictable for UI.
            if (list.size() > 10) {
                list = new ArrayList<>(list.subList(0, 10));
            }
            log.debug("WSC/GBIF search q='{}' returned {} results", q, list.size());
            return list;

        } catch (RestClientException e) {
            log.warn("WSC/GBIF search HTTP error for q='{}': {}", q, e.getMessage());
            return Collections.emptyList();
        } catch (Exception e) {
            log.warn("WSC/GBIF search error for q='{}': {}", q, e.getMessage());
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

        // Create new species from WSC/GBIF data
        Species species = new Species();
        species.setScientificName(name);
        species.setIsCustom(true);
        species.setCreatedBy(userId);
        species.setDataSource("wsc");
        if (family != null && !family.isBlank()) {
            species.setCareNotes("Family: " + family + ". Imported from World Spider Catalog (via GBIF).");
        } else {
            species.setCareNotes("Imported from World Spider Catalog (via GBIF).");
        }

        // Try to get a reference photo from iNaturalist
        String photoUrl = inatService.fetchPhotoUrl(name);
        if (photoUrl != null) species.setReferencePhotoUrl(photoUrl);

        Species saved = speciesRepository.save(species);
        return SpeciesDTO.from(saved);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /** Returns the text of the first non-blank matching field. */
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

    private Optional<WscSearchResultDTO> mapToDto(JsonNode item) {
        String name = text(item, "canonicalName", "scientificName");
        if (name == null || name.isBlank()) return Optional.empty();

        WscSearchResultDTO dto = new WscSearchResultDTO();
        dto.setName(name);
        dto.setFamily(text(item, "family"));
        dto.setStatus("accepted");

        String authorship = text(item, "authorship");
        if (authorship != null) {
            Matcher m = YEAR_PATTERN.matcher(authorship);
            if (m.find()) {
                dto.setYear(m.group(1));
                dto.setAuthor(authorship.replaceAll(",?\\s*\\d{4}", "")
                        .replaceAll("[(),]", "").trim());
            } else {
                dto.setAuthor(authorship);
            }
        }

        JsonNode keyNode = item.get("key");
        if (keyNode != null && !keyNode.isNull()) {
            dto.setTaxonId(keyNode.asText());
        }
        return Optional.of(dto);
    }

    /**
     * Resolves free text against GBIF /species/match scoped to WSC dataset.
     * This recovers accepted taxa for legacy names/synonyms.
     */
    private Optional<WscSearchResultDTO> resolveFromMatch(String q) {
        try {
            String matchUrl = UriComponentsBuilder
                    .fromHttpUrl(GBIF_SPECIES_MATCH)
                    .queryParam("name", q)
                    .queryParam("rank", "SPECIES")
                    .queryParam("datasetKey", WSC_DATASET_KEY)
                    .toUriString();

            JsonNode match = restTemplate.getForObject(matchUrl, JsonNode.class);
            if (match == null) return Optional.empty();
            if ("NONE".equalsIgnoreCase(text(match, "matchType"))) return Optional.empty();
            if (!"SPECIES".equalsIgnoreCase(text(match, "rank"))) return Optional.empty();

            String key = text(match, "acceptedUsageKey", "usageKey", "speciesKey");
            if (key == null || key.isBlank()) return Optional.empty();

            String detailUrl = GBIF_SPECIES_DETAIL + "/" + key;
            JsonNode detail = restTemplate.getForObject(detailUrl, JsonNode.class);
            if (detail == null) return Optional.empty();
            return mapToDto(detail);
        } catch (Exception e) {
            log.debug("WSC/GBIF match fallback failed for q='{}': {}", q, e.getMessage());
            return Optional.empty();
        }
    }
}
