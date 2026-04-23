package com.tarantulapp.service;

import com.tarantulapp.dto.DiscoverLocalSpeciesViewDTO;
import com.tarantulapp.dto.DiscoverPhotoDTO;
import com.tarantulapp.dto.SpeciesDTO;
import com.tarantulapp.entity.Species;
import com.tarantulapp.entity.SpeciesSynonym;
import com.tarantulapp.repository.SpeciesRepository;
import com.tarantulapp.repository.SpeciesSynonymRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.Optional;

@Service
public class DiscoverCatalogService {

    private final SpeciesRepository speciesRepository;
    private final InatService inatService;
    private final SpeciesSynonymRepository speciesSynonymRepository;

    public DiscoverCatalogService(SpeciesRepository speciesRepository,
                                  InatService inatService,
                                  SpeciesSynonymRepository speciesSynonymRepository) {
        this.speciesRepository = speciesRepository;
        this.inatService = inatService;
        this.speciesSynonymRepository = speciesSynonymRepository;
    }

    public Page<SpeciesDTO> findCatalogPage(
            String experienceLevel,
            String habitatType,
            String growthRate,
            String q,
            BigDecimal sizeMin,
            BigDecimal sizeMax,
            Pageable pageable) {
        Specification<Species> spec = buildSpec(experienceLevel, habitatType, growthRate, q, sizeMin, sizeMax);
        return speciesRepository.findAll(spec, pageable).map(SpeciesDTO::from);
    }

    public Optional<SpeciesDTO> findPublicCatalogById(int id) {
        return speciesRepository.findById(id)
                .filter(DiscoverCatalogService::isPublicCatalogRow)
                .map(SpeciesDTO::from);
    }

    /** Fila pública del catálogo app enlazada por clave GBIF (import / seed), si existe. */
    public Optional<Integer> findPublicCatalogSpeciesIdByGbifUsageKey(long gbifUsageKey) {
        return speciesRepository.findByGbifUsageKey(gbifUsageKey)
                .filter(DiscoverCatalogService::isPublicCatalogRow)
                .map(Species::getId);
    }

    /**
     * Foto comunitaria (iNat) por nombre, para clientes sin clave GBIF o como segunda oportunidad
     * cuando el catálogo no pudo resolver la URL en el mismo request.
     */
    public Optional<DiscoverPhotoDTO> photoFallbackByScientificName(String scientificName) {
        if (scientificName == null || scientificName.isBlank()) {
            return Optional.empty();
        }
        return inatService.resolveDiscoverPhoto(scientificName.trim());
    }

    /** Same as {@link #findPublicCatalogById(int)} plus iNat fallback photo metadata when URL missing. */
    public Optional<DiscoverLocalSpeciesViewDTO> findPublicCatalogViewById(int id) {
        Optional<SpeciesDTO> opt = findPublicCatalogById(id);
        if (opt.isEmpty()) return Optional.empty();
        SpeciesDTO s = opt.get();
        DiscoverLocalSpeciesViewDTO view = new DiscoverLocalSpeciesViewDTO();
        view.setSpecies(s);
        if (s.getScientificName() != null && lacksBlockingReferencePhoto(s.getReferencePhotoUrl())) {
            inatService.resolveDiscoverPhoto(s.getScientificName()).ifPresent(view::setFallbackPhoto);
            if (view.getFallbackPhoto() == null && s.getId() != null) {
                for (SpeciesSynonym syn : speciesSynonymRepository.findAllBySpeciesId(s.getId())) {
                    if (syn == null || syn.getSynonym() == null || syn.getSynonym().isBlank()) continue;
                    var maybePhoto = inatService.resolveDiscoverPhoto(syn.getSynonym());
                    if (maybePhoto.isPresent()) {
                        view.setFallbackPhoto(maybePhoto.get());
                        break;
                    }
                }
            }
        }
        return Optional.of(view);
    }

    /**
     * When {@code reference_photo_url} is missing, blank, or not an absolute {@code http(s)} URL,
     * the API may still resolve a community photo (iNat) instead of serving a broken relative value.
     */
    static boolean lacksBlockingReferencePhoto(String referencePhotoUrl) {
        if (referencePhotoUrl == null || referencePhotoUrl.isBlank()) {
            return true;
        }
        String t = referencePhotoUrl.trim();
        return !(t.startsWith("http://") || t.startsWith("https://"));
    }

    public static boolean isPublicCatalogRow(Species s) {
        if (s == null) return false;
        String ds = s.getDataSource();
        if (ds != null && (ds.equals("seed") || ds.equals("gbif") || ds.equals("wsc"))) {
            return true;
        }
        boolean notUserOwned = s.getCreatedBy() == null;
        boolean notCustom = !Boolean.TRUE.equals(s.getIsCustom());
        return notUserOwned && notCustom;
    }

    private static Specification<Species> buildSpec(
            String experienceLevel,
            String habitatType,
            String growthRate,
            String q,
            BigDecimal sizeMin,
            BigDecimal sizeMax) {
        // Catálogo público: fuentes oficiales / importadas compartidas, más filas “tipo catálogo”
        // (created_by nulo y no custom) por si data_source quedó desactualizado en algún entorno.
        Specification<Species> base = (root, query, cb) -> cb.or(
                root.get("dataSource").in("seed", "gbif", "wsc"),
                cb.and(
                        root.get("createdBy").isNull(),
                        cb.or(cb.isNull(root.get("isCustom")), cb.isFalse(root.get("isCustom")))
                )
        );

        if (experienceLevel != null && !experienceLevel.isBlank()) {
            String v = experienceLevel.trim();
            base = base.and((root, query, cb) -> cb.equal(cb.lower(root.get("experienceLevel")), v.toLowerCase(Locale.ROOT)));
        }
        if (habitatType != null && !habitatType.isBlank()) {
            String v = habitatType.trim();
            base = base.and((root, query, cb) -> cb.equal(cb.lower(root.get("habitatType")), v.toLowerCase(Locale.ROOT)));
        }
        if (growthRate != null && !growthRate.isBlank()) {
            String v = growthRate.trim();
            base = base.and((root, query, cb) -> cb.equal(cb.lower(root.get("growthRate")), v.toLowerCase(Locale.ROOT)));
        }
        if (q != null && !q.trim().isEmpty()) {
            String needle = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
            base = base.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("scientificName")), needle),
                    cb.like(cb.lower(root.get("commonName")), needle)
            ));
        }
        if (sizeMin != null) {
            base = base.and((root, query, cb) -> cb.or(
                    cb.and(cb.isNotNull(root.get("adultSizeCmMax")), cb.ge(root.get("adultSizeCmMax"), sizeMin)),
                    cb.and(
                            cb.isNull(root.get("adultSizeCmMax")),
                            cb.isNotNull(root.get("adultSizeCmMin")),
                            cb.ge(root.get("adultSizeCmMin"), sizeMin)
                    ),
                    cb.and(cb.isNull(root.get("adultSizeCmMax")), cb.isNull(root.get("adultSizeCmMin")))
            ));
        }
        if (sizeMax != null) {
            base = base.and((root, query, cb) -> cb.or(
                    cb.and(cb.isNotNull(root.get("adultSizeCmMin")), cb.le(root.get("adultSizeCmMin"), sizeMax)),
                    cb.and(
                            cb.isNull(root.get("adultSizeCmMin")),
                            cb.isNotNull(root.get("adultSizeCmMax")),
                            cb.le(root.get("adultSizeCmMax"), sizeMax)
                    ),
                    cb.and(cb.isNull(root.get("adultSizeCmMax")), cb.isNull(root.get("adultSizeCmMin")))
            ));
        }
        return base;
    }
}
