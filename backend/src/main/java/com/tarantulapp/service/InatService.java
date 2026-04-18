package com.tarantulapp.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.tarantulapp.dto.DiscoverPhotoDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Optional;

@Service
public class InatService {

    private static final Logger log = LoggerFactory.getLogger(InatService.class);
    private static final String INAT_BASE = "https://api.inaturalist.org/v1";

    private final RestTemplate restTemplate;

    public InatService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public String fetchPhotoUrl(String scientificName) {
        return resolveDiscoverPhoto(scientificName).map(DiscoverPhotoDTO::getUrl).orElse(null);
    }

    /**
     * Best-effort species photo from iNaturalist taxa search, with attribution for UI.
     */
    public Optional<DiscoverPhotoDTO> resolveDiscoverPhoto(String scientificName) {
        if (scientificName == null || scientificName.isBlank()) return Optional.empty();
        try {
            Optional<DiscoverPhotoDTO> exact = findPhotoDto(scientificName, true);
            if (exact.isPresent()) return exact;
            return findPhotoDto(scientificName, false);
        } catch (Exception e) {
            log.warn("iNaturalist photo lookup failed for '{}': {}", scientificName, e.getMessage());
            return Optional.empty();
        }
    }

    private Optional<DiscoverPhotoDTO> findPhotoDto(String scientificName, boolean speciesOnly) {
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
        if (response == null || response.getResults() == null || response.getResults().isEmpty()) {
            return Optional.empty();
        }

        String wanted = scientificName.trim().toLowerCase();
        for (InatTaxon taxon : response.getResults()) {
            if (taxon.getName() == null || !taxon.getName().trim().equalsIgnoreCase(wanted)) continue;
            Optional<DiscoverPhotoDTO> dto = toDto(taxon);
            if (dto.isPresent()) return dto;
        }
        for (InatTaxon taxon : response.getResults()) {
            Optional<DiscoverPhotoDTO> dto = toDto(taxon);
            if (dto.isPresent()) return dto;
        }
        return Optional.empty();
    }

    private Optional<DiscoverPhotoDTO> toDto(InatTaxon taxon) {
        if (taxon == null || taxon.getDefaultPhoto() == null) return Optional.empty();
        InatPhoto photo = taxon.getDefaultPhoto();
        String imageUrl = photo.getMediumUrl();
        if (imageUrl == null || imageUrl.isBlank()) {
            if (photo.getUrl() != null && !photo.getUrl().isBlank()) {
                imageUrl = photo.getUrl().replace("/square.", "/medium.");
            }
        }
        if (imageUrl == null || imageUrl.isBlank()) return Optional.empty();

        DiscoverPhotoDTO dto = new DiscoverPhotoDTO();
        dto.setUrl(imageUrl);
        dto.setSource("inat");
        if (photo.getAttribution() != null && !photo.getAttribution().isBlank()) {
            dto.setAttribution(photo.getAttribution());
        } else if (photo.getAttributionName() != null && !photo.getAttributionName().isBlank()) {
            String lic = photo.getLicenseCode() != null ? " (" + photo.getLicenseCode() + ")" : "";
            dto.setAttribution(photo.getAttributionName() + lic);
        }
        dto.setLicenseCode(photo.getLicenseCode());
        if (taxon.getId() != null) {
            dto.setTaxonPageUrl("https://www.inaturalist.org/taxa/" + taxon.getId());
        }
        return Optional.of(dto);
    }

    // ─── Inner types ──────────────────────────────────────────────────────────

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class InatTaxaResponse {
        private List<InatTaxon> results;
        public List<InatTaxon> getResults() { return results; }
        public void setResults(List<InatTaxon> r) { this.results = r; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class InatTaxon {
        private Long id;
        private String name;
        @JsonProperty("default_photo")
        private InatPhoto defaultPhoto;
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
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
        private String attribution;
        @JsonProperty("attribution_name")
        private String attributionName;
        @JsonProperty("license_code")
        private String licenseCode;
        public String getMediumUrl() { return mediumUrl; }
        public void setMediumUrl(String u) { this.mediumUrl = u; }
        public String getUrl() { return url; }
        public void setUrl(String u) { this.url = u; }
        public String getAttribution() { return attribution; }
        public void setAttribution(String a) { this.attribution = a; }
        public String getAttributionName() { return attributionName; }
        public void setAttributionName(String attributionName) { this.attributionName = attributionName; }
        public String getLicenseCode() { return licenseCode; }
        public void setLicenseCode(String licenseCode) { this.licenseCode = licenseCode; }
    }
}
