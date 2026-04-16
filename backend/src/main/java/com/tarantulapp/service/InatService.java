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
            String exact = findPhotoUrl(scientificName, true);
            if (exact != null) return exact;

            // Fallback: remove strict rank filter in case iNat classification differs.
            return findPhotoUrl(scientificName, false);
        } catch (Exception e) {
            log.warn("iNaturalist photo lookup failed for '{}': {}", scientificName, e.getMessage());
            return null;
        }
    }

    private String findPhotoUrl(String scientificName, boolean speciesOnly) {
        String urlBuilder = UriComponentsBuilder
                .fromHttpUrl(INAT_BASE + "/taxa")
                .queryParam("q", scientificName)
                .queryParam("per_page", 5)
                .queryParam("order", "desc")
                .queryParam("order_by", "observations_count")
                .toUriString();
        String url = speciesOnly
                ? UriComponentsBuilder.fromHttpUrl(urlBuilder).queryParam("rank", "species").toUriString()
                : urlBuilder;

        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "TarantulApp/1.0 (tarantula collection tracker)");
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        InatTaxaResponse response = restTemplate.exchange(
                url, HttpMethod.GET, entity, InatTaxaResponse.class).getBody();
        if (response == null || response.getResults() == null || response.getResults().isEmpty()) return null;

        String wanted = scientificName.trim().toLowerCase();
        for (InatTaxon taxon : response.getResults()) {
            if (taxon.getName() == null || !taxon.getName().trim().equalsIgnoreCase(wanted)) continue;
            String photoUrl = extractPhotoUrl(taxon);
            if (photoUrl != null) return photoUrl;
        }

        for (InatTaxon taxon : response.getResults()) {
            String photoUrl = extractPhotoUrl(taxon);
            if (photoUrl != null) return photoUrl;
        }
        return null;
    }

    private String extractPhotoUrl(InatTaxon taxon) {
        if (taxon == null || taxon.getDefaultPhoto() == null) return null;
        InatPhoto photo = taxon.getDefaultPhoto();
        if (photo.getMediumUrl() != null && !photo.getMediumUrl().isBlank()) return photo.getMediumUrl();
        if (photo.getUrl() != null && !photo.getUrl().isBlank()) {
            return photo.getUrl().replace("/square.", "/medium.");
        }
        return null;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class InatTaxaResponse {
        private List<InatTaxon> results;
        public List<InatTaxon> getResults() { return results; }
        public void setResults(List<InatTaxon> r) { this.results = r; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class InatTaxon {
        private String name;
        @JsonProperty("default_photo")
        private InatPhoto defaultPhoto;
        public String getName() { return name; }
        public void setName(String n) { this.name = n; }
        public InatPhoto getDefaultPhoto() { return defaultPhoto; }
        public void setDefaultPhoto(InatPhoto p) { this.defaultPhoto = p; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class InatPhoto {
        @JsonProperty("medium_url")
        private String mediumUrl;
        private String url;
        public String getMediumUrl() { return mediumUrl; }
        public void setMediumUrl(String u) { this.mediumUrl = u; }
        public String getUrl() { return url; }
        public void setUrl(String u) { this.url = u; }
    }
}
