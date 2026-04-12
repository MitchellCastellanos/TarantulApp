package com.tarantulapp.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.tarantulapp.dto.GbifSearchResultDTO;
import com.tarantulapp.dto.SpeciesDTO;
import com.tarantulapp.entity.Species;
import com.tarantulapp.repository.SpeciesRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class GbifService {

    private static final Logger log = LoggerFactory.getLogger(GbifService.class);
    private static final String GBIF_BASE = "https://api.gbif.org/v1";

    private final RestTemplate restTemplate;
    private final SpeciesRepository speciesRepository;

    public GbifService(RestTemplate restTemplate, SpeciesRepository speciesRepository) {
        this.restTemplate = restTemplate;
        this.speciesRepository = speciesRepository;
    }

    public List<GbifSearchResultDTO> search(String q) {
        if (q == null || q.isBlank()) return Collections.emptyList();
        try {
            String url = UriComponentsBuilder
                    .fromHttpUrl(GBIF_BASE + "/species/search")
                    .queryParam("q", q)
                    .queryParam("rank", "SPECIES")
                    .queryParam("status", "ACCEPTED")
                    .queryParam("limit", 10)
                    .toUriString();

            GbifSearchResponse response = restTemplate.exchange(
                    url, HttpMethod.GET, null,
                    new ParameterizedTypeReference<GbifSearchResponse>() {}
            ).getBody();

            return response != null && response.getResults() != null
                    ? response.getResults()
                    : Collections.emptyList();
        } catch (RestClientException e) {
            log.warn("GBIF search failed for q={}: {}", q, e.getMessage());
            return Collections.emptyList();
        }
    }

    public SpeciesDTO importSpecies(Long key, UUID userId) {
        // 1. Fetch species detail from GBIF
        GbifSearchResultDTO detail = fetchDetail(key);
        String canonicalName = detail.getCanonicalName() != null
                ? detail.getCanonicalName()
                : detail.getScientificName();

        if (canonicalName == null || canonicalName.isBlank()) {
            throw new IllegalArgumentException("No se pudo obtener el nombre de la especie desde GBIF");
        }

        // 2. Check for existing species to avoid duplicates
        Optional<Species> existing = speciesRepository.findByScientificNameIgnoreCase(canonicalName);
        if (existing.isPresent()) {
            return SpeciesDTO.from(existing.get());
        }

        // 3. Fetch vernacular name (common name)
        String commonName = fetchVernacularName(key);

        // 4. Create and persist new species
        Species species = new Species();
        species.setScientificName(canonicalName);
        species.setCommonName(commonName);
        species.setIsCustom(true);
        species.setCreatedBy(userId);
        species.setCareNotes("Importado desde GBIF (key: " + key + ")");

        Species saved = speciesRepository.save(species);
        return SpeciesDTO.from(saved);
    }

    private GbifSearchResultDTO fetchDetail(Long key) {
        try {
            String url = GBIF_BASE + "/species/" + key;
            GbifSearchResultDTO result = restTemplate.getForObject(url, GbifSearchResultDTO.class);
            if (result == null) {
                throw new IllegalArgumentException("Especie no encontrada en GBIF (key: " + key + ")");
            }
            return result;
        } catch (RestClientException e) {
            throw new IllegalArgumentException("Error al consultar GBIF: " + e.getMessage());
        }
    }

    private String fetchVernacularName(Long key) {
        try {
            String url = GBIF_BASE + "/species/" + key + "/vernacularNames?limit=20";
            GbifVernacularResponse response = restTemplate.exchange(
                    url, HttpMethod.GET, null,
                    new ParameterizedTypeReference<GbifVernacularResponse>() {}
            ).getBody();

            if (response == null || response.getResults() == null) return null;

            // Prefer English, then Spanish, then first available
            GbifVernacularName en = null;
            GbifVernacularName es = null;
            GbifVernacularName first = null;

            for (GbifVernacularName v : response.getResults()) {
                if (first == null) first = v;
                if ("eng".equalsIgnoreCase(v.getLanguage()) && en == null) en = v;
                if (("spa".equalsIgnoreCase(v.getLanguage()) || "es".equalsIgnoreCase(v.getLanguage())) && es == null) es = v;
            }

            GbifVernacularName chosen = en != null ? en : (es != null ? es : first);
            return chosen != null ? chosen.getVernacularName() : null;
        } catch (RestClientException e) {
            log.warn("Could not fetch vernacular names for GBIF key={}: {}", key, e.getMessage());
            return null;
        }
    }

    // ─── Inner response wrappers ──────────────────────────────────────────────

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class GbifSearchResponse {
        private List<GbifSearchResultDTO> results;
        public List<GbifSearchResultDTO> getResults() { return results; }
        public void setResults(List<GbifSearchResultDTO> results) { this.results = results; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class GbifVernacularResponse {
        private List<GbifVernacularName> results;
        public List<GbifVernacularName> getResults() { return results; }
        public void setResults(List<GbifVernacularName> results) { this.results = results; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class GbifVernacularName {
        private String vernacularName;
        private String language;
        public String getVernacularName() { return vernacularName; }
        public void setVernacularName(String vernacularName) { this.vernacularName = vernacularName; }
        public String getLanguage() { return language; }
        public void setLanguage(String language) { this.language = language; }
    }
}
