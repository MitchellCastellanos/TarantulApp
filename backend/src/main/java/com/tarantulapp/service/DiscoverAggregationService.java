package com.tarantulapp.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.tarantulapp.dto.DiscoverPhotoDTO;
import com.tarantulapp.dto.DiscoverSearchHitDTO;
import com.tarantulapp.dto.DiscoverTaxonDetailDTO;
import com.tarantulapp.dto.GbifSearchResultDTO;
import com.tarantulapp.dto.WscSearchResultDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Public read-only discover: WSC-first search, Theraphosidae GBIF fallback, taxon detail + photo chain.
 */
@Service
public class DiscoverAggregationService {

    private static final Logger log = LoggerFactory.getLogger(DiscoverAggregationService.class);
    private static final String GBIF_BASE = "https://api.gbif.org/v1";
    private static final String DATA_NOTE = "Taxonomy: World Spider Catalog via GBIF where applicable; "
            + "GBIF backbone for broader spider search; images from iNaturalist (community) or GBIF media when available.";

    private final WscService wscService;
    private final GbifService gbifService;
    private final InatService inatService;
    private final RestTemplate restTemplate;

    public DiscoverAggregationService(WscService wscService,
                                       GbifService gbifService,
                                       InatService inatService,
                                       RestTemplate restTemplate) {
        this.wscService = wscService;
        this.gbifService = gbifService;
        this.inatService = inatService;
        this.restTemplate = restTemplate;
    }

    /**
     * WSC checklist hits first, then merge accepted Theraphosidae hits from GBIF backbone (dedup by key).
     * WSC wins on duplicates so the source label stays authoritative when both match.
     */
    public List<DiscoverSearchHitDTO> search(String q) {
        if (q == null || (q = q.trim()).isEmpty()) {
            return List.of();
        }
        Map<Long, DiscoverSearchHitDTO> byKey = new LinkedHashMap<>();
        List<WscSearchResultDTO> wsc = wscService.search(q);
        for (WscSearchResultDTO row : wsc) {
            Long key = parseLong(row.getTaxonId());
            if (key == null) continue;
            DiscoverSearchHitDTO hit = new DiscoverSearchHitDTO();
            hit.setSource("wsc");
            hit.setGbifKey(key);
            hit.setCanonicalName(row.getName());
            hit.setFamily(row.getFamily());
            byKey.putIfAbsent(key, hit);
        }

        List<GbifSearchResultDTO> fb = gbifService.searchAcceptedSpeciesInFamily(
                q, GbifService.GBIF_THERAPHOSIDAE_FAMILY_KEY, 25);
        for (GbifSearchResultDTO row : fb) {
            if (row.getKey() == null) continue;
            if (byKey.containsKey(row.getKey())) continue;
            DiscoverSearchHitDTO hit = new DiscoverSearchHitDTO();
            hit.setSource("gbif");
            hit.setGbifKey(row.getKey());
            hit.setCanonicalName(firstNonBlank(row.getCanonicalName(), row.getScientificName()));
            hit.setFamily(row.getFamily());
            byKey.put(row.getKey(), hit);
        }

        List<DiscoverSearchHitDTO> out = new ArrayList<>(byKey.values());
        if (out.size() > 20) {
            out = new ArrayList<>(out.subList(0, 20));
        }
        return out;
    }

    public Optional<DiscoverTaxonDetailDTO> buildTaxonDetail(Long gbifKey) {
        if (gbifKey == null) return Optional.empty();
        Optional<GbifSearchResultDTO> opt = gbifService.tryFetchSpecies(gbifKey);
        if (opt.isEmpty()) return Optional.empty();
        GbifSearchResultDTO g = opt.get();
        String canonical = firstNonBlank(g.getCanonicalName(), g.getScientificName());
        if (canonical == null || canonical.isBlank()) return Optional.empty();

        DiscoverTaxonDetailDTO dto = new DiscoverTaxonDetailDTO();
        dto.setGbifKey(g.getKey());
        dto.setCanonicalName(canonical);
        dto.setScientificName(g.getScientificName());
        dto.setFamily(g.getFamily());
        dto.setRank(g.getRank());
        dto.setTaxonomicStatus(g.getStatus());
        dto.setVernacularName(firstNonBlank(g.getVernacularName(), gbifService.getVernacularNameForSpecies(gbifKey)));
        dto.setDataAttributionNote(DATA_NOTE);

        Optional<DiscoverPhotoDTO> photo = inatService.resolveDiscoverPhoto(canonical);
        if (photo.isEmpty()) {
            photo = fetchGbifSpeciesMediaPhoto(gbifKey);
        }
        dto.setPhoto(photo.orElse(null));
        return Optional.of(dto);
    }

    private Optional<DiscoverPhotoDTO> fetchGbifSpeciesMediaPhoto(Long usageKey) {
        try {
            String url = GBIF_BASE + "/species/" + usageKey + "/media";
            JsonNode root = restTemplate.getForObject(url, JsonNode.class);
            if (root == null || !root.has("results") || !root.get("results").isArray()) {
                return Optional.empty();
            }
            for (JsonNode m : root.get("results")) {
                String identifier = text(m, "identifier");
                if (identifier == null || identifier.isBlank() || !identifier.toLowerCase(Locale.ROOT).startsWith("http")) {
                    continue;
                }
                DiscoverPhotoDTO dto = new DiscoverPhotoDTO();
                dto.setUrl(identifier);
                dto.setSource("gbif");
                String ref = text(m, "references");
                String title = text(m, "title");
                StringBuilder attr = new StringBuilder("GBIF species media");
                if (title != null && !title.isBlank()) attr.append(": ").append(title);
                dto.setAttribution(attr.toString());
                dto.setLicenseCode(text(m, "license"));
                dto.setTaxonPageUrl("https://www.gbif.org/species/" + usageKey);
                return Optional.of(dto);
            }
        } catch (RestClientException e) {
            log.debug("GBIF media fetch failed for key={}: {}", usageKey, e.getMessage());
        } catch (Exception e) {
            log.debug("GBIF media parse failed for key={}: {}", usageKey, e.getMessage());
        }
        return Optional.empty();
    }

    private static String text(JsonNode node, String field) {
        if (node == null || field == null) return null;
        JsonNode v = node.get(field);
        if (v == null || v.isNull() || !v.isTextual()) return null;
        String s = v.asText();
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static Long parseLong(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return Long.parseLong(s.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) return a.trim();
        if (b != null && !b.isBlank()) return b.trim();
        return null;
    }
}
