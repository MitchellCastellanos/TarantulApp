package com.tarantulapp.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * JSON stored in {@code species.narrative_i18n}:
 * {@code { "careNotes"|"temperament"|"substrate": { "es","en","fr": "..." } }}
 * Optional extended keys (same per-locale shape) may be used by the app UI, e.g.
 * {@code preMoltSigns}, {@code moltCare}, {@code postMoltCare}, {@code moltRhythm}.
 */
public final class SpeciesNarrativeJson {

    private static final ObjectMapper OM = new ObjectMapper();

    private SpeciesNarrativeJson() {}

    public static String buildCareNotesTri(String es, String en, String fr) {
        Map<String, Map<String, String>> root = new LinkedHashMap<>();
        Map<String, String> care = new LinkedHashMap<>();
        care.put("es", es);
        care.put("en", en);
        care.put("fr", fr);
        root.put("careNotes", care);
        try {
            return OM.writeValueAsString(root);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    public static Map<String, Map<String, String>> parse(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return OM.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            return null;
        }
    }
}
