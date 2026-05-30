package com.tarantulapp.service;

import com.tarantulapp.entity.Species;
import com.tarantulapp.repository.SpeciesRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/** Admin-only manual creation of catalog species (e.g. to fill a reported taxonomy gap). */
@Service
public class SpeciesAdminService {

    private final SpeciesRepository speciesRepository;
    private final SpeciesGapService speciesGapService;

    public SpeciesAdminService(SpeciesRepository speciesRepository, SpeciesGapService speciesGapService) {
        this.speciesRepository = speciesRepository;
        this.speciesGapService = speciesGapService;
    }

    public record CreateSpeciesRequest(
            String scientificName,
            String commonName,
            String originRegion,
            String habitatType,
            String hobbyWorld,
            String experienceLevel,
            String growthRate,
            String temperament,
            Integer humidityMin,
            Integer humidityMax,
            BigDecimal adultSizeCmMin,
            BigDecimal adultSizeCmMax,
            String careNotes,
            String referencePhotoUrl,
            UUID gapReportId
    ) {}

    @Transactional
    public Map<String, Object> create(CreateSpeciesRequest req, UUID adminId) {
        String scientific = normalizeScientificName(req.scientificName());
        if (scientific == null) {
            throw new IllegalArgumentException("SCIENTIFIC_NAME_REQUIRED");
        }
        speciesRepository.findByScientificNameIgnoreCase(scientific).ifPresent(s -> {
            throw new IllegalArgumentException("SPECIES_ALREADY_EXISTS");
        });

        Species species = new Species();
        species.setScientificName(scientific);
        species.setCommonName(trim(req.commonName(), 150));
        species.setOriginRegion(trim(req.originRegion(), 150));
        species.setHabitatType(trim(req.habitatType(), 20));
        species.setHobbyWorld(trim(req.hobbyWorld(), 20));
        species.setExperienceLevel(trim(req.experienceLevel(), 20));
        species.setGrowthRate(trim(req.growthRate(), 20));
        species.setTemperament(trim(req.temperament(), 200));
        species.setHumidityMin(req.humidityMin());
        species.setHumidityMax(req.humidityMax());
        species.setAdultSizeCmMin(req.adultSizeCmMin());
        species.setAdultSizeCmMax(req.adultSizeCmMax());
        species.setCareNotes(req.careNotes());
        species.setReferencePhotoUrl(trim(req.referencePhotoUrl(), 500));
        species.setIsCustom(true);
        species.setCreatedBy(adminId);
        species.setDataSource("manual");

        Species saved = speciesRepository.save(species);

        // Close the matching gap (explicit id or name match) so the alert clears.
        if (req.gapReportId() != null) {
            speciesGapService.resolve(req.gapReportId(), saved.getId());
        } else {
            speciesGapService.resolveByName(scientific, saved.getId());
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", saved.getId());
        out.put("scientificName", saved.getScientificName());
        out.put("commonName", saved.getCommonName());
        out.put("isCustom", saved.getIsCustom());
        return out;
    }

    private static String normalizeScientificName(String raw) {
        if (raw == null) return null;
        String cleaned = raw.trim().replaceAll("\\s+", " ");
        if (cleaned.isEmpty()) return null;
        String[] parts = cleaned.toLowerCase(Locale.ROOT).split(" ");
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < parts.length; i++) {
            if (parts[i].isBlank()) continue;
            if (i == 0) {
                out.append(Character.toUpperCase(parts[i].charAt(0))).append(parts[i].substring(1));
            } else {
                out.append(' ').append(parts[i]);
            }
        }
        return out.toString();
    }

    private static String trim(String value, int maxLen) {
        if (value == null) return null;
        String out = value.trim();
        if (out.isEmpty()) return null;
        return out.length() > maxLen ? out.substring(0, maxLen) : out;
    }
}
