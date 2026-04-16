package com.tarantulapp.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;

/**
 * Fetches reference photos from iNaturalist for species that don't have a photo yet.
 * Uses the public iNaturalist API — no key required.
 */
@Service
public class InatService {

    private static final Logger log = LoggerFactory.getLogger(InatService.class);
    private static final String INAT_BASE = "https://api.inaturalist.org/v1";

    private final RestTemplate restTemplate;

    public InatService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Returns the medium-size photo URL from iNaturalist for the given species name,
     * or null if nothing is found / the API is unreachable.
     */
    public String fetchPhotoUrl(String scientificName) {
        if (scientificName == null || scientificName.isBlank()) return null;
        try {
            String url = UriComponentsBuilder
                    .fromHttpUrl(INAT_BASE + "/taxa")
                    .queryParam("q", scientificName)
                    .queryParam("rank", "species")
                    .queryParam("per_page", 1)
                    .toUriString();

            InatTaxaResponse response = restTemplate.getForObject(url, InatTaxaResponse.class);
            if (response == null || response.getResults() == null || response.getResults().isEmpty()) return null;

            InatTaxon taxon = response.getResults().get(0);
            if (taxon.getDefaultPhoto() == null) return null;
            return taxon.getDefaultPhoto().getMediumUrl();
        } catch (Exception e) {
            log.warn("iNaturalist photo lookup failed for '{}': {}", scientificName, e.getMessage());
            return null;
        }
    }

    // ─── Inner response wrappers ──────────────────────────────────────────────

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class InatTaxaResponse {
        private List<InatTaxon> results;
        public List<InatTaxon> getResults() { return results; }
        public void setResults(List<InatTaxon> r) { this.results = r; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class InatTaxon {
        private InatPhoto defaultPhoto;
        public InatPhoto getDefaultPhoto() { return defaultPhoto; }
        public void setDefaultPhoto(InatPhoto p) { this.defaultPhoto = p; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class InatPhoto {
        private String mediumUrl;
        public String getMediumUrl() { return mediumUrl; }
        public void setMediumUrl(String u) { this.mediumUrl = u; }
    }
}
