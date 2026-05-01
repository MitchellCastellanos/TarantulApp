package com.tarantulapp.controller;

import com.tarantulapp.dto.DiscoverLocalSpeciesViewDTO;
import com.tarantulapp.dto.DiscoverPhotoDTO;
import com.tarantulapp.dto.DiscoverSearchHitDTO;
import com.tarantulapp.dto.DiscoverTaxonDetailDTO;
import com.tarantulapp.dto.SpeciesDTO;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.service.DiscoverAggregationService;
import com.tarantulapp.service.DiscoverCatalogService;
import com.tarantulapp.service.SpeciesService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/species")
public class SpeciesController {

    private static final int PUBLIC_SPECIES_PAGE_CAP = 5000;
    private static final int DISCOVER_SEARCH_MAX_LEN = 120;

    private final SpeciesService speciesService;
    private final DiscoverCatalogService discoverCatalogService;
    private final DiscoverAggregationService discoverAggregationService;

    public SpeciesController(SpeciesService speciesService,
                             DiscoverCatalogService discoverCatalogService,
                             DiscoverAggregationService discoverAggregationService) {
        this.speciesService = speciesService;
        this.discoverCatalogService = discoverCatalogService;
        this.discoverAggregationService = discoverAggregationService;
    }

    /**
     * Descubrir (catálogo paginado): mismo contrato que {@code /api/public/discover/species} pero bajo
     * {@code /api/species/*}, que ya va en {@code permitAll} en entornos donde {@code /api/public/**} no aplica bien.
     */
    @GetMapping("/catalog")
    public ResponseEntity<Page<SpeciesDTO>> publicCatalog(
            @RequestParam(required = false) String experienceLevel,
            @RequestParam(required = false) String habitatType,
            @RequestParam(required = false) String growthRate,
            @RequestParam(required = false) String hobbyWorld,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) BigDecimal sizeMin,
            @RequestParam(required = false) BigDecimal sizeMax,
            @RequestParam(defaultValue = "0") int page,
            /** {@code size} reservado por Spring Data Web / pageable; usamos {@code pageSize}. */
            @RequestParam(name = "pageSize", defaultValue = "24") int pageSize,
            @RequestParam(defaultValue = "scientificName") String sort,
            @RequestParam(defaultValue = "asc") String direction) {
        int p = Math.max(0, page);
        int s = Math.min(Math.max(pageSize, 1), 60);
        Sort.Direction dir = "desc".equalsIgnoreCase(direction) ? Sort.Direction.DESC : Sort.Direction.ASC;
        String sortField = switch (sort) {
            case "commonName" -> "commonName";
            case "experienceLevel" -> "experienceLevel";
            case "habitatType" -> "habitatType";
            default -> "scientificName";
        };
        PageRequest pr = PageRequest.of(p, s, Sort.by(dir, sortField));
        return ResponseEntity.ok(discoverCatalogService.findCatalogPage(
                experienceLevel, habitatType, growthRate, hobbyWorld, q, sizeMin, sizeMax, pr));
    }

    @GetMapping("/discover-search")
    public ResponseEntity<List<DiscoverSearchHitDTO>> discoverSearch(@RequestParam(required = false) String q) {
        if (q == null || q.isBlank()) {
            return ResponseEntity.ok(List.of());
        }
        String trimmed = q.length() > DISCOVER_SEARCH_MAX_LEN ? q.substring(0, DISCOVER_SEARCH_MAX_LEN) : q;
        return ResponseEntity.ok(discoverAggregationService.search(trimmed));
    }

    @GetMapping("/discover-taxon")
    public ResponseEntity<DiscoverTaxonDetailDTO> discoverTaxon(@RequestParam Long gbifKey) {
        return discoverAggregationService.buildTaxonDetail(gbifKey)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/catalog-view")
    public ResponseEntity<DiscoverLocalSpeciesViewDTO> catalogView(@RequestParam int id) {
        return discoverCatalogService.findPublicCatalogViewById(id)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new NotFoundException("Especie no encontrada"));
    }

    /** iNaturalist (u opciones futuras) por nombre científico; 404 si no hay foto. */
    @GetMapping("/photo-fallback")
    public ResponseEntity<DiscoverPhotoDTO> photoFallback(@RequestParam String scientificName) {
        return discoverCatalogService.photoFallbackByScientificName(scientificName)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Descubrir: id de ficha en catálogo público para una clave GBIF, o {@code null} si no está enlazada. */
    @GetMapping("/public-id-by-gbif")
    public Map<String, Object> publicSpeciesIdByGbifKey(
            @RequestParam(value = "gbifKey", required = false) Long gbifKey) {
        Map<String, Object> body = new HashMap<>();
        if (gbifKey == null) {
            body.put("speciesId", null);
            return body;
        }
        body.put(
                "speciesId",
                discoverCatalogService.findOrImportPublicCatalogSpeciesIdByGbifUsageKey(gbifKey).orElse(null));
        return body;
    }

    /**
     * Lista de especies. Invitados: siempre catálogo público.
     * Con sesión: catálogo completo de la cuenta salvo {@code publicCatalog=true} (pantalla Descubrir).
     */
    @GetMapping
    public ResponseEntity<List<SpeciesDTO>> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Boolean publicCatalog) {
        boolean guest = !isLoggedInUser();
        boolean usePublic = guest || Boolean.TRUE.equals(publicCatalog);
        if (usePublic) {
            var page = discoverCatalogService.findCatalogPage(
                    null,
                    null,
                    null,
                    null,
                    q,
                    null,
                    null,
                    PageRequest.of(0, PUBLIC_SPECIES_PAGE_CAP, Sort.by(Sort.Direction.ASC, "scientificName")));
            return ResponseEntity.ok(page.getContent());
        }
        return ResponseEntity.ok(q != null ? speciesService.search(q) : speciesService.findAll());
    }

    @GetMapping("/{id:\\d+}")
    public ResponseEntity<SpeciesDTO> getById(@PathVariable Integer id) {
        if (!isLoggedInUser()) {
            return discoverCatalogService.findPublicCatalogById(id)
                    .map(ResponseEntity::ok)
                    .orElseThrow(() -> new NotFoundException("Especie no encontrada"));
        }
        return ResponseEntity.ok(speciesService.findById(id));
    }

    /** JWT presente (sesión real), no usuario anónimo de Spring Security. */
    private static boolean isLoggedInUser() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        return a != null
                && a.isAuthenticated()
                && !(a instanceof AnonymousAuthenticationToken);
    }
}
