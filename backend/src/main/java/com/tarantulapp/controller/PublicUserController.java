package com.tarantulapp.controller;

import com.tarantulapp.entity.User;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.util.PublicHandleRules;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/public/users")
public class PublicUserController {

    private final UserRepository userRepository;

    public PublicUserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /** Minimal public lookup by {@code public_handle} (case-insensitive) to open Spood, etc. */
    @GetMapping("/by-handle/{handle}")
    public ResponseEntity<Map<String, Object>> byHandle(@PathVariable String handle) {
        String normalized = PublicHandleRules.normalize(handle);
        if (normalized == null || normalized.isEmpty()) {
            throw new NotFoundException("Handle no encontrado");
        }
        User u = userRepository.findByPublicHandleIgnoreCase(normalized)
                .orElseThrow(() -> new NotFoundException("Handle no encontrado"));
        if (u.getPublicHandle() == null || u.getPublicHandle().isBlank()) {
            throw new NotFoundException("Handle no encontrado");
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", u.getId());
        m.put("displayName", u.getDisplayName() != null ? u.getDisplayName() : "");
        m.put("publicHandle", u.getPublicHandle());
        return ResponseEntity.ok(m);
    }

    /** Public handle availability check (no JWT). */
    @GetMapping("/handle-availability")
    public ResponseEntity<Map<String, Object>> handleAvailability(@RequestParam("handle") String handle) {
        String normalized = PublicHandleRules.normalize(handle);
        Map<String, Object> m = new LinkedHashMap<>();
        if (normalized == null
                || normalized.length() < PublicHandleRules.MIN_LEN
                || PublicHandleRules.isReserved(normalized)) {
            m.put("valid", false);
            m.put("normalized", normalized == null ? "" : normalized);
            m.put("available", false);
            m.put("reason", "INVALID");
            return ResponseEntity.ok(m);
        }
        boolean taken = userRepository.existsByPublicHandleIgnoreCase(normalized);
        m.put("valid", true);
        m.put("normalized", normalized);
        m.put("available", !taken);
        m.put("reason", taken ? "TAKEN" : null);
        return ResponseEntity.ok(m);
    }

    /** Public user search for @keeper autocomplete (only profiles that allow discoverability). */
    @GetMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> search(
            @RequestParam("q") String q,
            @RequestParam(name = "limit", defaultValue = "8") int limit
    ) {
        String query = q == null ? "" : q.trim();
        if (query.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }
        int safeLimit = Math.max(1, Math.min(limit, 20));
        List<Map<String, Object>> rows = userRepository.searchPublicProfiles(query, PageRequest.of(0, safeLimit))
                .stream()
                .map(u -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", u.getId());
                    m.put("displayName", u.getDisplayName() != null ? u.getDisplayName() : "");
                    m.put("publicHandle", u.getPublicHandle() != null ? u.getPublicHandle() : "");
                    m.put("profilePhoto", u.getProfilePhoto() != null ? u.getProfilePhoto() : "");
                    return m;
                })
                .toList();
        return ResponseEntity.ok(rows);
    }
}
