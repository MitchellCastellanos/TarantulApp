package com.tarantulapp.service;

import com.tarantulapp.entity.Species;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Map;

@Service
public class CareAutofillService {

    private static final class CareProfile {
        final String habitatType;
        final Integer humidityMin;
        final Integer humidityMax;
        final String ventilation;
        final String substrateType;
        final String experienceLevel;
        final String growthRate;
        final String temperament;
        final String careNotes;
        final double confidence;

        CareProfile(
                String habitatType,
                Integer humidityMin,
                Integer humidityMax,
                String ventilation,
                String substrateType,
                String experienceLevel,
                String growthRate,
                String temperament,
                String careNotes,
                double confidence) {
            this.habitatType = habitatType;
            this.humidityMin = humidityMin;
            this.humidityMax = humidityMax;
            this.ventilation = ventilation;
            this.substrateType = substrateType;
            this.experienceLevel = experienceLevel;
            this.growthRate = growthRate;
            this.temperament = temperament;
            this.careNotes = careNotes;
            this.confidence = confidence;
        }
    }

    public static final String CARE_SOURCE_RULESET_V1 = "autofill_ruleset_v1";

    private static final Map<String, CareProfile> GENUS_PROFILES = Map.ofEntries(
            Map.entry("Acanthoscurria", new CareProfile("terrestrial", 65, 75, "moderate", "Coco, moist topsoil",
                    "intermediate", "fast", "Defensive, active", "Genus-level inferred profile; verify for local lineages.", 0.86)),
            Map.entry("Brachypelma", new CareProfile("terrestrial", 50, 65, "moderate", "Dry coco, peat, coarse sand",
                    "beginner", "slow", "Usually calm but may flick urticating hairs", "Genus-level inferred profile; verify for local lineages.", 0.90)),
            Map.entry("Tliltocatl", new CareProfile("terrestrial", 50, 70, "moderate", "Coco, topsoil, peat",
                    "beginner", "moderate", "Defensive tendencies possible", "Genus-level inferred profile; verify for local lineages.", 0.84)),
            Map.entry("Grammostola", new CareProfile("terrestrial", 50, 65, "low", "Dry coco, peat, fine sand",
                    "beginner", "slow", "Generally docile", "Genus-level inferred profile; verify for local lineages.", 0.88)),
            Map.entry("Lasiodora", new CareProfile("terrestrial", 60, 75, "moderate", "Moist coco, topsoil",
                    "intermediate", "fast", "Food-driven, can be defensive", "Genus-level inferred profile; verify for local lineages.", 0.82)),
            Map.entry("Nhandu", new CareProfile("terrestrial", 60, 75, "moderate", "Coco, moist topsoil",
                    "intermediate", "moderate", "Defensive; strong urticating hairs", "Genus-level inferred profile; verify for local lineages.", 0.81)),
            Map.entry("Avicularia", new CareProfile("arboreal", 65, 80, "high", "Loose coco + vertical anchors",
                    "intermediate", "moderate", "Skittish, generally not defensive", "Genus-level inferred profile; verify for local lineages.", 0.85)),
            Map.entry("Caribena", new CareProfile("arboreal", 70, 85, "high", "Loose coco + arboreal structure",
                    "intermediate", "moderate", "Fast juveniles; calmer adults", "Genus-level inferred profile; verify for local lineages.", 0.85)),
            Map.entry("Poecilotheria", new CareProfile("arboreal", 65, 80, "high", "Coco + cork bark vertical hides",
                    "advanced", "fast", "Very fast and defensive", "Genus-level inferred profile; verify for local lineages.", 0.88)),
            Map.entry("Theraphosa", new CareProfile("terrestrial", 75, 90, "low", "Deep moist substrate",
                    "advanced", "fast", "Very defensive; potent urticating hairs", "Genus-level inferred profile; verify for local lineages.", 0.87)),
            Map.entry("Pterinochilus", new CareProfile("terrestrial", 50, 65, "moderate", "Dry coco, peat, burrow-friendly",
                    "intermediate", "fast", "Defensive and very fast", "Genus-level inferred profile; verify for local lineages.", 0.86)),
            Map.entry("Cyriopagopus", new CareProfile("fossorial", 70, 85, "low", "Very deep, moist substrate",
                    "advanced", "moderate", "Highly defensive, reclusive", "Genus-level inferred profile; verify for local lineages.", 0.83))
    );

    public AutofillResult autofill(Species species, String canonicalName, String hobbyWorld) {
        if (species == null) {
            return AutofillResult.none();
        }
        String genus = extractGenus(canonicalName != null ? canonicalName : species.getScientificName());
        CareProfile profile = genus != null ? GENUS_PROFILES.get(genus) : null;
        if (profile == null) {
            profile = fallbackByHobbyWorld(hobbyWorld);
        }
        if (profile == null) {
            return AutofillResult.none();
        }

        int filled = 0;
        if (isBlank(species.getHabitatType()) && profile.habitatType != null) {
            species.setHabitatType(profile.habitatType);
            filled++;
        }
        if (species.getHumidityMin() == null && profile.humidityMin != null) {
            species.setHumidityMin(profile.humidityMin);
            filled++;
        }
        if (species.getHumidityMax() == null && profile.humidityMax != null) {
            species.setHumidityMax(profile.humidityMax);
            filled++;
        }
        if (isBlank(species.getVentilation()) && profile.ventilation != null) {
            species.setVentilation(profile.ventilation);
            filled++;
        }
        if (isBlank(species.getSubstrateType()) && profile.substrateType != null) {
            species.setSubstrateType(profile.substrateType);
            filled++;
        }
        if (isBlank(species.getExperienceLevel()) && profile.experienceLevel != null) {
            species.setExperienceLevel(profile.experienceLevel);
            filled++;
        }
        if (isBlank(species.getGrowthRate()) && profile.growthRate != null) {
            species.setGrowthRate(profile.growthRate);
            filled++;
        }
        if (isBlank(species.getTemperament()) && profile.temperament != null) {
            species.setTemperament(profile.temperament);
            filled++;
        }
        if (isBlank(species.getCareNotes()) && profile.careNotes != null) {
            species.setCareNotes(profile.careNotes);
            filled++;
        }

        if (filled == 0) {
            return AutofillResult.none();
        }
        return new AutofillResult(CARE_SOURCE_RULESET_V1, profile.confidence, filled);
    }

    private static CareProfile fallbackByHobbyWorld(String hobbyWorld) {
        if ("old_world".equalsIgnoreCase(hobbyWorld)) {
            return new CareProfile("terrestrial", 60, 75, "moderate", "Coco/topsoil blend", "intermediate",
                    "moderate", "Fast, more defensive tendencies", "Inferred from Old World distribution profile.", 0.62);
        }
        if ("new_world".equalsIgnoreCase(hobbyWorld)) {
            return new CareProfile("terrestrial", 55, 70, "moderate", "Coco/topsoil blend", "beginner",
                    "moderate", "Generally calmer; urticating hairs possible", "Inferred from New World distribution profile.", 0.62);
        }
        return null;
    }

    private static String extractGenus(String scientificName) {
        if (scientificName == null || scientificName.isBlank()) return null;
        String[] parts = scientificName.trim().split("\\s+");
        if (parts.length == 0) return null;
        String raw = parts[0];
        if (raw.isBlank()) return null;
        String first = raw.substring(0, 1).toUpperCase(Locale.ROOT);
        String rest = raw.length() > 1 ? raw.substring(1).toLowerCase(Locale.ROOT) : "";
        return first + rest;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    public static final class AutofillResult {
        private final String source;
        private final Double confidence;
        private final int fieldsFilled;

        private AutofillResult(String source, Double confidence, int fieldsFilled) {
            this.source = source;
            this.confidence = confidence;
            this.fieldsFilled = fieldsFilled;
        }

        public static AutofillResult none() {
            return new AutofillResult(null, null, 0);
        }

        public String source() {
            return source;
        }

        public Double confidence() {
            return confidence;
        }

        public int fieldsFilled() {
            return fieldsFilled;
        }
    }
}

