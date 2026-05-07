package com.tarantulapp.util;

import com.tarantulapp.entity.Species;
import org.springframework.data.jpa.domain.Specification;

/**
 * Single source of truth for “keeper-grade” catalog rows (matches DB count spec and {@link com.tarantulapp.dto.SpeciesDTO}).
 */
public final class SpeciesKeeperProfileSignals {

    private SpeciesKeeperProfileSignals() {
    }

    /**
     * Same disjunctive rules as {@link #keeperGradeProfileSpecification()} — keep them aligned.
     */
    public static boolean hasKeeperGradeProfile(Species s) {
        if (s == null) {
            return false;
        }
        if ("seed".equals(s.getDataSource())) {
            return true;
        }
        if (s.getCareProfileSource() != null && !s.getCareProfileSource().isBlank()) {
            return true;
        }
        if (s.getHumidityMin() != null && s.getHumidityMax() != null) {
            return true;
        }
        String careNotes = s.getCareNotes();
        if (careNotes != null && careNotes.length() > 8) {
            return true;
        }
        String narrative = s.getNarrativeI18n();
        return narrative != null && narrative.length() > 8;
    }

    public static Specification<Species> keeperGradeProfileSpecification() {
        return (root, query, cb) -> cb.or(
                cb.equal(root.get("dataSource"), "seed"),
                cb.isNotNull(root.get("careProfileSource")),
                cb.and(cb.isNotNull(root.get("humidityMin")), cb.isNotNull(root.get("humidityMax"))),
                cb.and(cb.isNotNull(root.get("careNotes")), cb.gt(cb.length(root.get("careNotes")), 8)),
                cb.and(cb.isNotNull(root.get("narrativeI18n")), cb.gt(cb.length(root.get("narrativeI18n")), 8))
        );
    }
}
