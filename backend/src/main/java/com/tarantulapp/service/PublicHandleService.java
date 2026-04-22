package com.tarantulapp.service;

import com.tarantulapp.entity.User;
import com.tarantulapp.repository.UserRepository;
import com.tarantulapp.util.PublicHandleRules;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class PublicHandleService {

    private final UserRepository userRepository;

    public PublicHandleService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * Asigna un {@code public_handle} unico si el usuario aun no tiene uno.
     * Idempotente y tolerante a carreras (indice unico en BD).
     */
    @Transactional
    public void assignInitialPublicHandleIfMissing(UUID userId) {
        User first = userRepository.findById(userId).orElse(null);
        if (first == null) {
            return;
        }
        if (first.getPublicHandle() != null && !first.getPublicHandle().isBlank()) {
            return;
        }
        String base = buildBaseCandidate(first.getDisplayName(), first.getEmail());
        for (int attempt = 0; attempt < 40; attempt++) {
            User u = userRepository.findById(userId).orElse(null);
            if (u == null) {
                return;
            }
            if (u.getPublicHandle() != null && !u.getPublicHandle().isBlank()) {
                return;
            }
            String candidate = attempt == 0 ? base : trimToMax(base + "_" + randomSuffix(), PublicHandleRules.MAX_LEN);
            if (PublicHandleRules.isReserved(candidate)) {
                candidate = trimToMax(candidate + "x", PublicHandleRules.MAX_LEN);
            }
            if (candidate.length() < PublicHandleRules.MIN_LEN) {
                candidate = trimToMax("keeper_" + randomSuffix(), PublicHandleRules.MAX_LEN);
            }
            try {
                u.setPublicHandle(candidate);
                userRepository.saveAndFlush(u);
                return;
            } catch (DataIntegrityViolationException ex) {
                // colision; siguiente candidato
            }
        }
        User u = userRepository.findById(userId).orElse(null);
        if (u == null) {
            return;
        }
        if (u.getPublicHandle() != null && !u.getPublicHandle().isBlank()) {
            return;
        }
        String fallback = trimToMax("keeper_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12),
                PublicHandleRules.MAX_LEN);
        u.setPublicHandle(fallback);
        userRepository.save(u);
    }

    private static String buildBaseCandidate(String displayName, String email) {
        String fromDisplay = PublicHandleRules.normalize(displayName);
        if (fromDisplay != null && fromDisplay.length() >= PublicHandleRules.MIN_LEN && !PublicHandleRules.isReserved(fromDisplay)) {
            return trimToMax(fromDisplay, 40);
        }
        String local = emailLocalPart(email);
        String fromEmail = PublicHandleRules.normalize(local);
        if (fromEmail != null && fromEmail.length() >= PublicHandleRules.MIN_LEN && !PublicHandleRules.isReserved(fromEmail)) {
            return trimToMax(fromEmail, 40);
        }
        String base = fromDisplay != null && !fromDisplay.isBlank() ? fromDisplay
                : (fromEmail != null && !fromEmail.isBlank() ? fromEmail : "keeper");
        base = trimToMax(base, 40);
        if (PublicHandleRules.isReserved(base)) {
            base = trimToMax(base + "k", 40);
        }
        if (base.length() < PublicHandleRules.MIN_LEN) {
            base = "keeper";
        }
        return base;
    }

    private static String emailLocalPart(String email) {
        if (email == null) {
            return "";
        }
        String e = email.trim().toLowerCase();
        int at = e.indexOf('@');
        if (at <= 0) {
            return e;
        }
        return e.substring(0, at);
    }

    private static String randomSuffix() {
        int n = ThreadLocalRandom.current().nextInt(1000, 999_999);
        return Integer.toString(n);
    }

    private static String trimToMax(String s, int max) {
        if (s == null) {
            return "";
        }
        return s.length() <= max ? s : s.substring(0, max);
    }
}
