package com.tarantulapp.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.tarantulapp.dto.GbifSearchResultDTO;
import com.tarantulapp.dto.SpeciesDTO;
import com.tarantulapp.entity.Species;
import com.tarantulapp.entity.SpeciesSynonym;
import com.tarantulapp.repository.SpeciesRepository;
import com.tarantulapp.repository.SpeciesSynonymRepository;
import com.tarantulapp.util.HobbyWorldResolver;
import com.tarantulapp.util.SpeciesNarrativeJson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.stream.Collectors;

@Service
public class GbifService {

    private static final Logger log = LoggerFactory.getLogger(GbifService.class);
    private static final String GBIF_BASE = "https://api.gbif.org/v1";

    /** GBIF backbone family key for Theraphosidae (public species search fallback). */
    public static final long GBIF_THERAPHOSIDAE_FAMILY_KEY = 5650L;

    private final RestTemplate restTemplate;
    private final SpeciesRepository speciesRepository;
    private final SpeciesSynonymRepository speciesSynonymRepository;
    private final InatService inatService;
    private final CareAutofillService careAutofillService;

    public GbifService(RestTemplate restTemplate,
                       SpeciesRepository speciesRepository,
                       SpeciesSynonymRepository speciesSynonymRepository,
                       InatService inatService,
                       CareAutofillService careAutofillService) {
        this.restTemplate = restTemplate;
        this.speciesRepository = speciesRepository;
        this.speciesSynonymRepository = speciesSynonymRepository;
        this.inatService = inatService;
        this.careAutofillService = careAutofillService;
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Busca en GBIF usando dos estrategias:
     * 1. /species/search — búsqueda de texto (solo nombres aceptados)
     * 2. /species/match  — resuelve sinónimos al nombre aceptado actual
     * Los resultados se fusionan y deduplicam por key.
     */
    /**
     * Accepted species names in a given family (GBIF backbone), for discover fallback when WSC has no hits.
     */
    public List<GbifSearchResultDTO> searchAcceptedSpeciesInFamily(String q, long familyKey, int limit) {
        if (q == null || q.isBlank()) return Collections.emptyList();
        int cap = Math.min(Math.max(limit, 1), 25);
        try {
            String url = UriComponentsBuilder
                    .fromHttpUrl(GBIF_BASE + "/species/search")
                    .queryParam("q", q)
                    .queryParam("rank", "SPECIES")
                    .queryParam("status", "ACCEPTED")
                    .queryParam("familyKey", familyKey)
                    .queryParam("limit", cap)
                    .toUriString();

            GbifSearchResponse response = restTemplate.exchange(
                    url, HttpMethod.GET, null,
                    new ParameterizedTypeReference<GbifSearchResponse>() {}
            ).getBody();

            List<GbifSearchResultDTO> raw = response != null && response.getResults() != null
                    ? response.getResults()
                    : Collections.emptyList();
            // familyKey en /species/search no excluye ruido (p. ej. coincidencias en descripciones); filtrar por nombre de familia.
            return keepTheraphosidaeOnly(raw);
        } catch (RestClientException e) {
            log.warn("GBIF family-scoped search failed for q={}: {}", q, e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Page of accepted species keys in Theraphosidae (for monthly family-wide discovery).
     * Uses {@code higherTaxonKey} on /species/search; filters defensively to family Theraphosidae.
     */
    public AcceptedSpeciesPage listAcceptedTheraphosidaePage(int offset, int limit) {
        int cap = Math.min(Math.max(limit, 1), 100);
        int off = Math.max(offset, 0);
        try {
            String url = UriComponentsBuilder
                    .fromHttpUrl(GBIF_BASE + "/species/search")
                    .queryParam("rank", "SPECIES")
                    .queryParam("status", "ACCEPTED")
                    .queryParam("higherTaxonKey", GBIF_THERAPHOSIDAE_FAMILY_KEY)
                    .queryParam("offset", off)
                    .queryParam("limit", cap)
                    .toUriString();
            GbifSearchResponse resp = restTemplate.exchange(
                    url, HttpMethod.GET, null,
                    new ParameterizedTypeReference<GbifSearchResponse>() {}
            ).getBody();
            if (resp == null) return new AcceptedSpeciesPage(Collections.emptyList(), true);
            List<Long> keys = new ArrayList<>();
            if (resp.getResults() != null) {
                for (GbifSearchResultDTO r : resp.getResults()) {
                    if (!isTheraphosidaeBackboneSpecies(r)) continue;
                    if (r.getKey() != null) keys.add(r.getKey());
                }
            }
            return new AcceptedSpeciesPage(keys, Boolean.TRUE.equals(resp.getEndOfRecords()));
        } catch (RestClientException e) {
            log.warn("GBIF family-listing failed offset={} limit={}: {}", off, cap, e.getMessage());
            return new AcceptedSpeciesPage(Collections.emptyList(), true);
        }
    }

    public static class AcceptedSpeciesPage {
        private final List<Long> keys;
        private final boolean endOfRecords;
        public AcceptedSpeciesPage(List<Long> keys, boolean endOfRecords) {
            this.keys = keys;
            this.endOfRecords = endOfRecords;
        }
        public List<Long> getKeys() { return keys; }
        public boolean isEndOfRecords() { return endOfRecords; }
    }

    /** Species detail from GBIF backbone; empty if missing or error. */
    public Optional<GbifSearchResultDTO> tryFetchSpecies(Long key) {
        if (key == null) return Optional.empty();
        try {
            return Optional.of(fetchDetail(key));
        } catch (Exception e) {
            log.debug("GBIF species fetch failed for key={}: {}", key, e.getMessage());
            return Optional.empty();
        }
    }

    public String getVernacularNameForSpecies(Long key) {
        return fetchVernacularName(key);
    }

    /** Best-effort name → accepted GBIF species usageKey (Theraphosidae scoped). */
    public Optional<Long> tryResolveAcceptedKey(String name) {
        if (name == null || name.isBlank()) return Optional.empty();
        return Optional.ofNullable(resolveToAcceptedKey(name.trim()));
    }

    /**
     * Ensures a public catalog row exists for a GBIF taxon key and refreshes its taxonomy snapshot.
     * Idempotent by {@code gbif_usage_key}.
     */
    public Optional<SpeciesDTO> ensurePublicCatalogSpecies(Long key) {
        if (key == null) return Optional.empty();

        Optional<Species> byGbifKey = speciesRepository.findByGbifUsageKey(key);
        if (byGbifKey.isPresent()) {
            Species existing = byGbifKey.get();
            applyGbifSnapshot(existing, key, true);
            return Optional.of(SpeciesDTO.from(speciesRepository.save(existing)));
        }

        GbifSearchResultDTO detail = fetchDetail(key);
        if (!isTheraphosidaeBackboneSpecies(detail)) {
            return Optional.empty();
        }
        String canonicalName = detail.getCanonicalName() != null
                ? detail.getCanonicalName()
                : detail.getScientificName();
        if (canonicalName == null || canonicalName.isBlank()) {
            return Optional.empty();
        }

        Optional<Species> existingByName = speciesRepository.findByScientificNameIgnoreCase(canonicalName);
        if (existingByName.isPresent()) {
            Species existing = existingByName.get();
            existing.setGbifUsageKey(key);
            applyGbifSnapshot(existing, key, true);
            return Optional.of(SpeciesDTO.from(speciesRepository.save(existing)));
        }

        Optional<SpeciesSynonym> existingSyn = speciesSynonymRepository.findBySynonymIgnoreCase(canonicalName);
        if (existingSyn.isPresent()) {
            Species existing = speciesRepository.findById(existingSyn.get().getSpeciesId()).orElse(null);
            if (existing != null) {
                existing.setGbifUsageKey(key);
                applyGbifSnapshot(existing, key, true);
                return Optional.of(SpeciesDTO.from(speciesRepository.save(existing)));
            }
        }

        Species created = new Species();
        created.setScientificName(canonicalName);
        created.setIsCustom(false);
        created.setCreatedBy(null);
        created.setDataSource("gbif");
        created.setGbifUsageKey(key);
        applyGbifSnapshot(created, key, true);

        Species saved = speciesRepository.save(created);
        saveSynonyms(key, saved.getId(), canonicalName);
        return Optional.of(SpeciesDTO.from(saved));
    }

    /** Refreshes taxonomy-linked fields from GBIF while preserving keeper-curated husbandry fields. */
    public Optional<SpeciesDTO> refreshCatalogTaxonomy(Integer speciesId) {
        if (speciesId == null) return Optional.empty();
        Species s = speciesRepository.findById(speciesId).orElse(null);
        if (s == null || s.getGbifUsageKey() == null) {
            return Optional.empty();
        }
        applyGbifSnapshot(s, s.getGbifUsageKey(), true);
        Species saved = speciesRepository.save(s);
        saveSynonyms(s.getGbifUsageKey(), saved.getId(), saved.getScientificName());
        return Optional.of(SpeciesDTO.from(saved));
    }

    public List<GbifSearchResultDTO> search(String q) {
        if (q == null || q.isBlank()) return Collections.emptyList();

        List<GbifSearchResultDTO> results = new ArrayList<>(doSearchRequest(q));

        // Intentar resolver el query como posible sinónimo
        try {
            Long matchKey = resolveToAcceptedKey(q);
            if (matchKey != null) {
                boolean alreadyPresent = results.stream().anyMatch(r -> matchKey.equals(r.getKey()));
                if (!alreadyPresent) {
                    GbifSearchResultDTO matched = fetchDetail(matchKey);
                    if (isTheraphosidaeBackboneSpecies(matched)) {
                        results.add(0, matched); // al frente por relevancia
                    }
                }
            }
        } catch (Exception e) {
            log.warn("GBIF match enrichment failed for '{}': {}", q, e.getMessage());
        }

        return results;
    }

    /**
     * Resolves New vs Old World from catalog origin text when present, otherwise from GBIF
     * {@code /species/{key}/distributions} (best-effort).
     */
    public String resolveHobbyWorldForGbifSpecies(Long key, String originRegion) {
        String fromOrigin = HobbyWorldResolver.fromOriginRegion(originRegion);
        if (fromOrigin != null) {
            return fromOrigin;
        }
        return fetchDistributionHobbyWorld(key);
    }

    private void enrichHobbyWorldIfBlank(Species species, Long gbifKey) {
        if (species == null || gbifKey == null) {
            return;
        }
        if (species.getHobbyWorld() != null && !species.getHobbyWorld().isBlank()) {
            return;
        }
        String resolved = resolveHobbyWorldForGbifSpecies(gbifKey, species.getOriginRegion());
        if (resolved != null) {
            species.setHobbyWorld(resolved);
        }
    }

    private String fetchDistributionHobbyWorld(Long key) {
        try {
            String url = GBIF_BASE + "/species/" + key + "/distributions?limit=50";
            JsonNode root = restTemplate.getForObject(url, JsonNode.class);
            if (root == null) {
                return null;
            }
            JsonNode results = root.get("results");
            if (results == null || !results.isArray()) {
                return null;
            }
            Set<String> hints = new LinkedHashSet<>();
            for (JsonNode row : results) {
                String locality = textJson(row, "locality");
                String iso = textJson(row, "countryCode");
                if (iso == null) {
                    String country = textJson(row, "country");
                    if (country != null && country.length() == 2) {
                        iso = country;
                    }
                }
                String h = HobbyWorldResolver.fromGbifDistributionHints(iso, locality);
                if (h != null) {
                    hints.add(h);
                }
            }
            if (hints.isEmpty()) {
                return null;
            }
            if (hints.size() > 1) {
                return null;
            }
            return hints.iterator().next();
        } catch (Exception e) {
            log.debug("GBIF distributions for hobby_world failed key={}: {}", key, e.getMessage());
            return null;
        }
    }

    private static String textJson(JsonNode node, String field) {
        if (node == null) {
            return null;
        }
        JsonNode n = node.get(field);
        if (n == null || !n.isTextual()) {
            return null;
        }
        String v = n.asText().trim();
        return v.isEmpty() ? null : v;
    }

    private String buildDistributionSummary(Long key) {
        try {
            String url = GBIF_BASE + "/species/" + key + "/distributions?limit=100";
            JsonNode root = restTemplate.getForObject(url, JsonNode.class);
            if (root == null) return null;
            JsonNode results = root.get("results");
            if (results == null || !results.isArray()) return null;

            Set<String> countries = new LinkedHashSet<>();
            for (JsonNode row : results) {
                String country = textJson(row, "country");
                if (country == null || country.isBlank()) continue;
                countries.add(country.trim());
                if (countries.size() >= 6) break;
            }
            if (countries.isEmpty()) return null;
            return String.join(", ", countries);
        } catch (Exception e) {
            log.debug("GBIF distributions summary failed key={}: {}", key, e.getMessage());
            return null;
        }
    }

    private static String nonBlank(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    private void applyGbifSnapshot(Species species, Long gbifKey, boolean fillMissingReferencePhoto) {
        if (species == null || gbifKey == null) return;
        GbifSearchResultDTO detail = fetchDetail(gbifKey);
        String canonicalName = nonBlank(detail.getCanonicalName());
        if (canonicalName == null) canonicalName = nonBlank(detail.getScientificName());
        if (canonicalName != null && !canonicalName.equalsIgnoreCase(species.getScientificName())) {
            Optional<Species> other = speciesRepository.findByScientificNameIgnoreCase(canonicalName);
            if (other.isEmpty() || other.get().getId().equals(species.getId())) {
                species.setScientificName(canonicalName);
            }
        }

        String vernacular = nonBlank(fetchVernacularName(gbifKey));
        if (vernacular != null) {
            species.setCommonName(vernacular);
        }
        if (species.getGbifUsageKey() == null) {
            species.setGbifUsageKey(gbifKey);
        }
        if (species.getDataSource() == null || species.getDataSource().isBlank() || "manual".equals(species.getDataSource())) {
            species.setDataSource("gbif");
        }
        if (species.getCreatedBy() == null) {
            species.setIsCustom(false);
        }

        String hw = resolveHobbyWorldForGbifSpecies(gbifKey, species.getOriginRegion());
        if (hw != null) {
            species.setHobbyWorld(hw);
        }
        if (species.getOriginRegion() == null || species.getOriginRegion().isBlank()) {
            String region = buildDistributionSummary(gbifKey);
            if (region != null) {
                species.setOriginRegion(region);
            }
        }

        if (fillMissingReferencePhoto && (species.getReferencePhotoUrl() == null || species.getReferencePhotoUrl().isBlank())) {
            String photo = inatService.fetchPhotoUrl(canonicalName != null ? canonicalName : species.getScientificName());
            if (photo != null && !photo.isBlank()) {
                species.setReferencePhotoUrl(photo);
            }
        }
        if (species.getCareNotes() == null || species.getCareNotes().isBlank()) {
            species.setCareNotes("Taxonomy synced from GBIF backbone (WSC-linked where applicable).");
        }
        if (species.getSubstrateType() == null || species.getSubstrateType().isBlank()) {
            species.setSubstrateType(nonBlank(detail.getRank()));
        }
        if (species.getTemperament() == null || species.getTemperament().isBlank()) {
            species.setTemperament(nonBlank(detail.getStatus()));
        }

        species.setTaxonomyLastSyncedAt(LocalDateTime.now());
        CareAutofillService.AutofillResult autofill = careAutofillService.autofill(species, canonicalName, species.getHobbyWorld());
        if (autofill.fieldsFilled() > 0) {
            species.setCareProfileSource(autofill.source());
            if (autofill.confidence() != null) {
                species.setCareProfileConfidence(BigDecimal.valueOf(autofill.confidence()));
            }
        }
    }

    /**
     * Importa una especie de GBIF a la BD local.
     * Si ya existe (por nombre o sinónimo), regresa la existente.
     * Al crear nueva especie, también persiste sus sinónimos conocidos.
     */
    public SpeciesDTO importSpecies(Long key, UUID userId) {
        if (key == null) {
            throw new IllegalArgumentException("GBIF key requerida");
        }

        Optional<Species> byGbifKey = speciesRepository.findByGbifUsageKey(key);
        if (byGbifKey.isPresent()) {
            return SpeciesDTO.from(byGbifKey.get());
        }

        GbifSearchResultDTO detail = fetchDetail(key);
        String canonicalName = detail.getCanonicalName() != null
                ? detail.getCanonicalName()
                : detail.getScientificName();

        if (canonicalName == null || canonicalName.isBlank()) {
            throw new IllegalArgumentException("No se pudo obtener el nombre de la especie desde GBIF");
        }

        Optional<Species> existing = speciesRepository.findByScientificNameIgnoreCase(canonicalName);
        if (existing.isPresent()) {
            Species e = existing.get();
            e.setGbifUsageKey(key);
            enrichHobbyWorldIfBlank(e, key);
            return SpeciesDTO.from(speciesRepository.save(e));
        }

        Optional<SpeciesSynonym> existingSyn = speciesSynonymRepository.findBySynonymIgnoreCase(canonicalName);
        if (existingSyn.isPresent()) {
            Species e = speciesRepository.findById(existingSyn.get().getSpeciesId()).orElseThrow();
            e.setGbifUsageKey(key);
            enrichHobbyWorldIfBlank(e, key);
            return SpeciesDTO.from(speciesRepository.save(e));
        }

        // Crear nueva especie
        String commonName = fetchVernacularName(key);
        Species species = new Species();
        species.setScientificName(canonicalName);
        species.setCommonName(commonName);
        species.setIsCustom(true);
        species.setCreatedBy(userId);
        species.setDataSource("gbif");
        species.setGbifUsageKey(key);
        String careEs = "Importado desde GBIF (key: " + key + ")";
        String careEn = "Imported from GBIF (key: " + key + ").";
        String careFr = "Importé depuis GBIF (clé : " + key + ").";
        species.setCareNotes(careEs);
        species.setNarrativeI18n(SpeciesNarrativeJson.buildCareNotesTri(careEs, careEn, careFr));

        // Foto de referencia desde iNaturalist
        String photoUrl = inatService.fetchPhotoUrl(canonicalName);
        if (photoUrl != null) species.setReferencePhotoUrl(photoUrl);

        enrichHobbyWorldIfBlank(species, key);

        Species saved = speciesRepository.save(species);

        // Guardar sinónimos en background (no falla el import si esto falla)
        saveSynonyms(key, saved.getId(), canonicalName);

        return SpeciesDTO.from(saved);
    }

    // ─── Internals ────────────────────────────────────────────────────────────

    /**
     * Llama /species/match con el nombre dado.
     * Si el resultado es un sinónimo, sigue el acceptedUsageKey.
     * Retorna null si no hay match útil (matchType=NONE, no es SPECIES, etc.)
     */
    private Long resolveToAcceptedKey(String name) {
        try {
            String url = UriComponentsBuilder
                    .fromHttpUrl(GBIF_BASE + "/species/match")
                    .queryParam("name", name)
                    .queryParam("rank", "SPECIES")
                    .queryParam("familyKey", GBIF_THERAPHOSIDAE_FAMILY_KEY)
                    .toUriString();

            GbifMatchResponse match = restTemplate.getForObject(url, GbifMatchResponse.class);
            if (match == null || "NONE".equals(match.getMatchType())) return null;
            if (!"SPECIES".equals(match.getRank())) return null;

            Long key = match.getUsageKey();
            if (Boolean.TRUE.equals(match.getSynonym()) && match.getAcceptedUsageKey() != null) {
                key = match.getAcceptedUsageKey();
            }
            return key;
        } catch (Exception e) {
            log.warn("GBIF match failed for '{}': {}", name, e.getMessage());
            return null;
        }
    }

    private List<GbifSearchResultDTO> doSearchRequest(String q) {
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

            List<GbifSearchResultDTO> raw = response != null && response.getResults() != null
                    ? response.getResults()
                    : Collections.emptyList();
            return keepTheraphosidaeOnly(raw);
        } catch (RestClientException e) {
            log.warn("GBIF search failed for q={}: {}", q, e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * GBIF /species/search puede devolver taxones ajenos (p. ej. coincidencias por texto en descripciones).
     * Para esta app solo exponemos especies con familia backbone {@code Theraphosidae}.
     */
    private static boolean isTheraphosidaeBackboneSpecies(GbifSearchResultDTO r) {
        if (r == null) return false;
        String f = r.getFamily();
        if (f == null || f.isBlank()) return false;
        return "theraphosidae".equalsIgnoreCase(f.trim());
    }

    private static List<GbifSearchResultDTO> keepTheraphosidaeOnly(List<GbifSearchResultDTO> list) {
        return list.stream()
                .filter(GbifService::isTheraphosidaeBackboneSpecies)
                .collect(Collectors.toList());
    }

    private GbifSearchResultDTO fetchDetail(Long key) {
        try {
            GbifSearchResultDTO result = restTemplate.getForObject(
                    GBIF_BASE + "/species/" + key, GbifSearchResultDTO.class);
            if (result == null) throw new IllegalArgumentException("Especie no encontrada en GBIF (key: " + key + ")");
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

            GbifVernacularName en = null, es = null, first = null;
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

    /** Guarda los sinónimos de una especie recién importada desde GBIF. */
    private void saveSynonyms(Long gbifKey, Integer speciesId, String canonicalName) {
        try {
            String url = GBIF_BASE + "/species/" + gbifKey + "/synonyms?limit=50";
            GbifSearchResponse response = restTemplate.exchange(
                    url, HttpMethod.GET, null,
                    new ParameterizedTypeReference<GbifSearchResponse>() {}
            ).getBody();

            if (response == null || response.getResults() == null) return;

            for (GbifSearchResultDTO syn : response.getResults()) {
                String synName = syn.getCanonicalName() != null ? syn.getCanonicalName() : syn.getScientificName();
                if (synName == null || synName.isBlank() || synName.equalsIgnoreCase(canonicalName)) continue;
                if (!speciesSynonymRepository.existsBySynonymIgnoreCase(synName)) {
                    SpeciesSynonym s = new SpeciesSynonym();
                    s.setSpeciesId(speciesId);
                    s.setSynonym(synName);
                    s.setSource("gbif");
                    speciesSynonymRepository.save(s);
                }
            }
        } catch (Exception e) {
            log.warn("Could not save synonyms for GBIF key={}: {}", gbifKey, e.getMessage());
        }
    }

    // ─── Inner response wrappers ──────────────────────────────────────────────

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class GbifSearchResponse {
        private List<GbifSearchResultDTO> results;
        private Boolean endOfRecords;
        public List<GbifSearchResultDTO> getResults() { return results; }
        public void setResults(List<GbifSearchResultDTO> r) { this.results = r; }
        public Boolean getEndOfRecords() { return endOfRecords; }
        public void setEndOfRecords(Boolean v) { this.endOfRecords = v; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class GbifMatchResponse {
        private Long usageKey;
        private Boolean synonym;
        private Long acceptedUsageKey;
        private String matchType;   // EXACT | FUZZY | HIGHERRANK | NONE
        private String rank;        // SPECIES | GENUS | ...
        public Long getUsageKey() { return usageKey; }
        public void setUsageKey(Long k) { this.usageKey = k; }
        public Boolean getSynonym() { return synonym; }
        public void setSynonym(Boolean s) { this.synonym = s; }
        public Long getAcceptedUsageKey() { return acceptedUsageKey; }
        public void setAcceptedUsageKey(Long k) { this.acceptedUsageKey = k; }
        public String getMatchType() { return matchType; }
        public void setMatchType(String t) { this.matchType = t; }
        public String getRank() { return rank; }
        public void setRank(String r) { this.rank = r; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class GbifVernacularResponse {
        private List<GbifVernacularName> results;
        public List<GbifVernacularName> getResults() { return results; }
        public void setResults(List<GbifVernacularName> r) { this.results = r; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class GbifVernacularName {
        private String vernacularName;
        private String language;
        public String getVernacularName() { return vernacularName; }
        public void setVernacularName(String v) { this.vernacularName = v; }
        public String getLanguage() { return language; }
        public void setLanguage(String l) { this.language = l; }
    }
}
