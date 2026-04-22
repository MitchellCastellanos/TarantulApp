package com.tarantulapp.controller;

import com.tarantulapp.entity.User;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
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
        String normalized = normalizeHandle(handle);
        if (normalized.isEmpty()) {
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

    private static String normalizeHandle(String raw) {
        if (raw == null) {
            return "";
        }
        String t = raw.trim();
        if (t.startsWith("@")) {
            t = t.substring(1).trim();
        }
        return t;
    }
}
