package com.tarantulapp.service;

import com.tarantulapp.dto.PublicOriginDTO;
import com.tarantulapp.entity.OriginVerificationSubmission;
import com.tarantulapp.entity.User;
import com.tarantulapp.entity.VerifiedOriginKind;
import com.tarantulapp.exception.NotFoundException;
import com.tarantulapp.repository.OriginVerificationSubmissionRepository;
import com.tarantulapp.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class VerifiedOriginService {

    private final UserRepository userRepository;
    private final OriginVerificationSubmissionRepository submissionRepository;

    public VerifiedOriginService(UserRepository userRepository,
                                 OriginVerificationSubmissionRepository submissionRepository) {
        this.userRepository = userRepository;
        this.submissionRepository = submissionRepository;
    }

    public static boolean isVerified(User user) {
        if (user == null) {
            return false;
        }
        if (user.getVerifiedOriginAt() != null) {
            return true;
        }
        return user.getStorefrontVerifiedAt() != null;
    }

    @Transactional(readOnly = true)
    public PublicOriginDTO resolvePublicOrigin(User user) {
        if (!isVerified(user)) {
            return null;
        }
        String kind = resolveKind(user);
        return new PublicOriginDTO(true, kind, resolveDisplayName(user), user.getLogoUrl(), user.getLogoBwUrl());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> toPublicMap(User user) {
        PublicOriginDTO dto = resolvePublicOrigin(user);
        if (dto == null) {
            return Map.of("verified", false);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("verified", true);
        out.put("kind", dto.getKind());
        out.put("displayName", dto.getDisplayName());
        out.put("logoUrl", dto.getLogoUrl());
        out.put("logoBwUrl", dto.getLogoBwUrl());
        return out;
    }

    @Transactional
    public User grantVerifiedOrigin(UUID userId, VerifiedOriginKind kind) {
        User user = requireUser(userId);
        Instant now = Instant.now();
        user.setVerifiedOriginAt(now);
        user.setVerifiedOriginKind(kind.name());
        if (kind == VerifiedOriginKind.VENDOR || kind == VerifiedOriginKind.STORE) {
            if (user.getStorefrontVerifiedAt() == null) {
                user.setStorefrontVerifiedAt(now);
            }
        }
        return userRepository.save(user);
    }

    @Transactional
    public User revokeVerifiedOrigin(UUID userId) {
        User user = requireUser(userId);
        user.setVerifiedOriginAt(null);
        user.setVerifiedOriginKind(null);
        user.setStorefrontVerifiedAt(null);
        return userRepository.save(user);
    }

    @Transactional
    public Map<String, Object> submit(UUID userId, String kindRaw, String note, String evidenceUrl) {
        VerifiedOriginKind kind = VerifiedOriginKind.fromString(kindRaw);
        if (note == null || note.isBlank()) {
            throw new IllegalArgumentException("NOTE_REQUIRED");
        }
        User user = requireUser(userId);
        if (isVerified(user)) {
            throw new IllegalArgumentException("ORIGIN_ALREADY_VERIFIED");
        }
        submissionRepository.findFirstByUserIdOrderByCreatedAtDesc(userId).ifPresent(existing -> {
            if ("pending".equalsIgnoreCase(existing.getStatus())) {
                throw new IllegalArgumentException("SUBMISSION_ALREADY_PENDING");
            }
        });

        OriginVerificationSubmission sub = new OriginVerificationSubmission();
        sub.setUserId(userId);
        sub.setKind(kind.name());
        sub.setNote(note.trim());
        sub.setEvidenceUrl(trimUrl(evidenceUrl));
        sub.setStatus("pending");
        OriginVerificationSubmission saved = submissionRepository.save(sub);
        return mapSubmission(saved, user);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> myStatus(UUID userId) {
        User user = requireUser(userId);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("verifiedOrigin", isVerified(user));
        out.put("origin", toPublicMap(user));
        submissionRepository.findFirstByUserIdOrderByCreatedAtDesc(userId)
                .ifPresentOrElse(s -> out.put("latestSubmission", mapSubmission(s, user)),
                        () -> out.put("latestSubmission", null));
        return out;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> adminList(String statusFilter) {
        List<OriginVerificationSubmission> rows = statusFilter == null || statusFilter.isBlank()
                ? submissionRepository.findTop50ByOrderByCreatedAtDesc()
                : submissionRepository.findTop50ByStatusOrderByCreatedAtDesc(statusFilter.trim().toLowerCase());
        return rows.stream().map(s -> {
            User u = userRepository.findById(s.getUserId()).orElse(null);
            return mapSubmission(s, u);
        }).collect(Collectors.toList());
    }

    @Transactional
    public Map<String, Object> adminReview(UUID submissionId, String status, String reviewerNote) {
        String st = status == null ? "" : status.trim().toLowerCase();
        if (!"approved".equals(st) && !"rejected".equals(st)) {
            throw new IllegalArgumentException("INVALID_STATUS");
        }
        OriginVerificationSubmission sub = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new NotFoundException("Submission not found"));
        sub.setStatus(st);
        sub.setReviewerNote(reviewerNote == null ? null : reviewerNote.trim());
        sub.setReviewedAt(Instant.now());
        submissionRepository.save(sub);

        User user = requireUser(sub.getUserId());
        if ("approved".equals(st)) {
            grantVerifiedOrigin(user.getId(), VerifiedOriginKind.fromString(sub.getKind()));
            user = requireUser(user.getId());
        }
        return mapSubmission(sub, user);
    }

    private Map<String, Object> mapSubmission(OriginVerificationSubmission s, User user) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", s.getId());
        out.put("userId", s.getUserId());
        out.put("kind", s.getKind());
        out.put("note", s.getNote() == null ? "" : s.getNote());
        out.put("evidenceUrl", s.getEvidenceUrl() == null ? "" : s.getEvidenceUrl());
        out.put("status", s.getStatus());
        out.put("reviewerNote", s.getReviewerNote() == null ? "" : s.getReviewerNote());
        out.put("createdAt", s.getCreatedAt());
        out.put("reviewedAt", s.getReviewedAt());
        if (user != null) {
            out.put("userEmail", user.getEmail());
            out.put("userDisplayName", user.getDisplayName() == null ? "" : user.getDisplayName());
            out.put("verifiedOrigin", isVerified(user));
            out.put("origin", toPublicMap(user));
        }
        return out;
    }

    private static String resolveKind(User user) {
        if (user.getVerifiedOriginKind() != null && !user.getVerifiedOriginKind().isBlank()) {
            return VerifiedOriginKind.fromString(user.getVerifiedOriginKind()).name();
        }
        if (Boolean.TRUE.equals(user.getVerifiedBreeder())) {
            return VerifiedOriginKind.VENDOR.name();
        }
        return VerifiedOriginKind.SELLER.name();
    }

    private static String resolveDisplayName(User user) {
        if (user.getStorefrontName() != null && !user.getStorefrontName().isBlank()) {
            return user.getStorefrontName().trim();
        }
        if (user.getDisplayName() != null && !user.getDisplayName().isBlank()) {
            return user.getDisplayName().trim();
        }
        if (user.getPublicHandle() != null && !user.getPublicHandle().isBlank()) {
            return user.getPublicHandle().trim();
        }
        return "Verified Origin";
    }

    private User requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario no encontrado"));
    }

    private static String trimUrl(String raw) {
        if (raw == null) {
            return null;
        }
        String t = raw.trim();
        return t.isEmpty() ? null : t;
    }
}
