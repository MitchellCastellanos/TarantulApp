package com.tarantulapp.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;

@Service
public class InatService {

    private static final Logger log = LoggerFactory.getLogger(InatService.class);
    private static final String INAT_BASE = "https://api.inaturalist.org/v1";

    private final RestTemplate restTemplate;

    public InatService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public String fetchPhotoUrl(String scientificName) {
        if (scientificName == null || scientificName.isBlank()) return null;
        try {
            String url = UriComponentsBuilder
                    .fromHttpUrl(INAT_BASE + "/taxa")
                    .queryParam("q", scientificName)
                    .queryParam("rank", "species")
                    .queryParam("per_page", 1)
                    .toUriString();

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "TarantulApp/1.0 (tarantula collection tracker)");
            HttpEntity<Void> entity = new HttpEntity<>(headers);

            InatTaxaResponse response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, InatTaxaResponse.class).getBody();

            if (response == null || response.getResults() == null || response.getResults().isEmpty()) return null;

            InatTaxon taxon = response.getResults().get(0);
            if (taxon.getDefaultPhoto() == null) return null;
            return taxon.getDefaultPhoto().getMediumUrl();
        } catch (Exception e) {
            log.warn("iNaturalist photo lookup failed for '{}': {}", scientificName, e.getMessage());
            return null;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class InatTaxaResponse {
        private List<InatTaxon> results;
        public List<InatTaxon> getResults() { return results; }
        public void setResults(List<InatTaxon> r) { this.results = r; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class InatTaxon {
        @JsonProperty("default_photo")
        private InatPhoto defaultPhoto;
        public InatPhoto getDefaultPhoto() { return defaultPhoto; }
        public void setDefaultPhoto(InatPhoto p) { this.defaultPhoto = p; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class InatPhoto {
        @JsonProperty("medium_url")
        private String mediumUrl;
        public String getMediumUrl() { return mediumUrl; }
        public void setMediumUrl(String u) { this.mediumUrl = u; }
    }
}
